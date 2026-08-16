package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// ── Config ──

type serverConfig struct {
	Port int `json:"port"`
}

func loadConfig() serverConfig {
	cfg := serverConfig{Port: 8080}

	data, err := os.ReadFile("./server.json")
	if err != nil {
		return cfg
	}

	if err := json.Unmarshal(data, &cfg); err != nil {
		return serverConfig{Port: 8080}
	}

	if cfg.Port == 0 {
		cfg.Port = 8080
	}

	return cfg
}

// ── RSS Feed ──

type rssItem struct {
	Title     string `json:"title"`
	Link      string `json:"link"`
	Published string `json:"published"`
}

type rssResponse struct {
	Title string      `json:"title"`
	Items []rssItem   `json:"items"`
}

func handleRSS(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)

	url := r.URL.Query().Get("url")
	if url == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing url parameter"})
		return
	}

	// Fetch the feed
	resp, err := http.Get(url)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("failed to fetch feed: %v", err)})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("upstream HTTP %d", resp.StatusCode)})
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "failed to read response"})
		return
	}

	xmlContent := string(body)

	// Try RSS 2.0 parsing
	items, title, err := parseRSS(xmlContent)
	if err != nil {
		// Try Atom parsing
		items, title, err = parseAtom(xmlContent)
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "failed to parse feed XML"})
			return
		}
	}

	// Limit to 10 items
	if len(items) > 10 {
		items = items[:10]
	}

	writeJSON(w, http.StatusOK, rssResponse{
		Title: title,
		Items: items,
	})
}

func parseRSS(xmlContent string) ([]rssItem, string, error) {
	// Simple RSS parser using string operations (no external deps)
	// Extract title
	title := extractTag(xmlContent, "<title>", "</title>")

	// Extract items
	var items []rssItem
	// Find all <item>...</item> blocks
	for {
		itemStart := strings.Index(xmlContent, "<item>")
		if itemStart == -1 {
			break
		}
		itemEnd := strings.Index(xmlContent[itemStart:], "</item>")
		if itemEnd == -1 {
			break
		}
		itemEnd += itemStart + 7 // length of "</item>"
		itemContent := xmlContent[itemStart:itemEnd]

		items = append(items, rssItem{
			Title:     stripCDATA(extractTag(itemContent, "<title>", "</title>")),
			Link:      extractTag(itemContent, "<link>", "</link>"),
			Published: extractTag(itemContent, "<pubDate>", "</pubDate>"),
		})

		xmlContent = xmlContent[itemEnd:]
	}

	if len(items) == 0 {
		return nil, title, fmt.Errorf("no items found")
	}

	return items, title, nil
}

func parseAtom(xmlContent string) ([]rssItem, string, error) {
	// Simple Atom parser using string operations
	title := extractTag(xmlContent, "<title>", "</title>")

	var items []rssItem
	// Find all <entry>...</entry> blocks
	for {
		entryStart := strings.Index(xmlContent, "<entry>")
		if entryStart == -1 {
			break
		}
		entryEnd := strings.Index(xmlContent[entryStart:], "</entry>")
		if entryEnd == -1 {
			break
		}
		entryEnd += entryStart + 8 // length of "</entry>"
		entryContent := xmlContent[entryStart:entryEnd]

		// Extract link (prefer href attribute)
		link := extractLink(entryContent)
		updated := extractTag(entryContent, "<updated>", "</updated>")

		items = append(items, rssItem{
			Title:     stripCDATA(extractTag(entryContent, "<title>", "</title>")),
			Link:      link,
			Published: updated,
		})

		xmlContent = xmlContent[entryEnd:]
	}

	if len(items) == 0 {
		return nil, title, fmt.Errorf("no entries found")
	}

	return items, title, nil
}

func extractTag(content, startTag, endTag string) string {
	start := strings.Index(content, startTag)
	if start == -1 {
		return ""
	}
	start += len(startTag)
	end := strings.Index(content[start:], endTag)
	if end == -1 {
		return ""
	}
	return strings.TrimSpace(content[start : start+end])
}

func stripCDATA(s string) string {
	// Remove CDATA markers: <![CDATA[...]]>
	s = strings.TrimPrefix(s, "<![CDATA[")
	s = strings.TrimSuffix(s, "]]>")
	return s
}

func extractLink(content string) string {
	// Look for <link href="...">
	linkStart := strings.Index(content, `<link href="`)
	if linkStart == -1 {
		// Try without href
		linkStart = strings.Index(content, "<link>")
		if linkStart == -1 {
			return ""
		}
		linkStart += 6
		linkEnd := strings.Index(content[linkStart:], "</link>")
		if linkEnd == -1 {
			return ""
		}
		return strings.TrimSpace(content[linkStart : linkStart+linkEnd])
	}
	linkStart += 11 // length of `<link href="`
	linkEnd := strings.Index(content[linkStart:], `"`)
	if linkEnd == -1 {
		return ""
	}
	return strings.TrimSpace(content[linkStart : linkStart+linkEnd])
}

// ── GitHub Proxy ──

type githubPR struct {
	Title    string `json:"title"`
	HTMLURL  string `json:"html_url"`
	Number   int    `json:"number"`
	User     githubUser `json:"user"`
	CreatedAt string `json:"created_at"`
}

type githubUser struct {
	Login string `json:"login"`
}

type githubPRResponse struct {
	PRs []githubPR `json:"prs"`
}

func handleGitHub(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)

	org := r.URL.Query().Get("org")
	user := r.URL.Query().Get("user")

	if org == "" && user == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing org or user parameter"})
		return
	}

	var allPRs []githubPR

	// Fetch PRs for orgs
	if org != "" {
		prs, err := fetchOrgPRs(org)
		if err != nil {
			log.Printf("Failed to fetch PRs for org %s: %v", org, err)
		} else {
			allPRs = append(allPRs, prs...)
		}
	}

	// Fetch PRs for users
	if user != "" {
		prs, err := fetchUserPRs(user)
		if err != nil {
			log.Printf("Failed to fetch PRs for user %s: %v", user, err)
		} else {
			allPRs = append(allPRs, prs...)
		}
	}

	// Sort by created date (newest first)
	sortPRsByDate(allPRs)

	// Limit to 20
	if len(allPRs) > 20 {
		allPRs = allPRs[:20]
	}

	// Ensure non-null response
	if allPRs == nil {
		allPRs = []githubPR{}
	}

	writeJSON(w, http.StatusOK, githubPRResponse{PRs: allPRs})
}

func fetchOrgPRs(org string) ([]githubPR, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/*/pulls?state=open&sort=created&direction=desc&per_page=10", org)
	return fetchGitHubAPI(url)
}

func fetchUserPRs(username string) ([]githubPR, error) {
	url := fmt.Sprintf("https://api.github.com/search/issues?q=type:pr+author:%s+state:open&sort=created&order=desc&per_page=10", username)
	return fetchGitHubSearchAPI(url)
}

func extractUserLogin(m map[string]interface{}, key string) string {
	if val, ok := m[key].(map[string]interface{}); ok {
		if login, ok := val["login"].(string); ok {
			return login
		}
	}
	return ""
}

func fetchGitHubAPI(url string) ([]githubPR, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "toolbox-server")

	// Add auth token if available
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("token %s", token))
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned HTTP %d", resp.StatusCode)
	}

	var data []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	var prs []githubPR
	for _, item := range data {
		prs = append(prs, githubPR{
			Title:     getStringField(item, "title"),
			HTMLURL:   getStringField(item, "html_url"),
			Number:    getIntField(item, "number"),
			CreatedAt: getStringField(item, "created_at"),
			User: githubUser{
				Login: extractUserLogin(item, "user"),
			},
		})
	}

	return prs, nil
}

func fetchGitHubSearchAPI(url string) ([]githubPR, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "toolbox-server")

	// Add auth token if available
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("token %s", token))
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned HTTP %d", resp.StatusCode)
	}

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	items, ok := data["items"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected response format")
	}

	var prs []githubPR
	for _, item := range items {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		// Skip non-PR items
		pullRequest, ok := itemMap["pull_request"].(map[string]interface{})
		if !ok {
			continue
		}

		htmlURL, _ := pullRequest["html_url"].(string)
		prs = append(prs, githubPR{
			Title:     getStringField(itemMap, "title"),
			HTMLURL:   htmlURL,
			Number:    getIntField(itemMap, "number"),
			CreatedAt: getStringField(itemMap, "created_at"),
			User: githubUser{
				Login: extractUserLogin(itemMap, "user"),
			},
		})
	}

	return prs, nil
}

func getStringField(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}

func getIntField(m map[string]interface{}, key string) int {
	if val, ok := m[key].(float64); ok {
		return int(val)
	}
	return 0
}

func sortPRsByDate(prs []githubPR) {
	// Simple bubble sort (small dataset)
	for i := 0; i < len(prs); i++ {
		for j := i + 1; j < len(prs); j++ {
			if prs[j].CreatedAt > prs[i].CreatedAt {
				prs[i], prs[j] = prs[j], prs[i]
			}
		}
	}
}

// ── Helpers ──

func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	w.Header().Set("Content-Type", "application/json")
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// ── Main ──

func main() {
	cfg := loadConfig()

	// Get the project root (parent of server/)
	projectRoot, err := os.Getwd()
	if err != nil {
		log.Fatal("Failed to get working directory:", err)
	}

	// Serve static files from project root
	http.Handle("/", http.FileServer(http.Dir(projectRoot)))

	// API routes
	http.HandleFunc("/api/rss", handleRSS)
	http.HandleFunc("/api/github/pulls", handleGitHub)

	addr := fmt.Sprintf(":%d", cfg.Port)
	log.Printf("Toolbox server starting on http://localhost%s", addr)
	log.Printf("Static files served from: %s", projectRoot)

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal("Server failed:", err)
	}
}
