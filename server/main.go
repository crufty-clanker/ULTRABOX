// SPDX-FileCopyrightText: 2026 Toolbox Authors
// SPDX-License-Identifier: MIT

package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// ── Version ──

var Version = "dev"

// ── Config ──

type serverConfig struct {
	Port int `json:"port"`
}

// ── Cache ──

type cacheEntry struct {
	data      interface{}
	expiresAt time.Time
}

type cache struct {
	items map[string]cacheEntry
	ttl   time.Duration
}

func newCache(ttl time.Duration) *cache {
	return &cache{
		items: make(map[string]cacheEntry),
		ttl:   ttl,
	}
}

func (c *cache) get(key string) (interface{}, bool) {
	entry, exists := c.items[key]
	if !exists {
		return nil, false
	}
	if time.Now().After(entry.expiresAt) {
		// Expired, remove it
		delete(c.items, key)
		return nil, false
	}
	return entry.data, true
}

func (c *cache) set(key string, data interface{}) {
	c.items[key] = cacheEntry{
		data:      data,
		expiresAt: time.Now().Add(c.ttl),
	}
}

func (c *cache) clear() {
	c.items = make(map[string]cacheEntry)
}

func loadConfig(configPath string) serverConfig {
	cfg := serverConfig{Port: 8080}

	// Use provided path or default
	if configPath == "" {
		configPath = "./server.json"
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		log.Printf("Warning: Could not read config file %s: %v", configPath, err)
		return cfg
	}

	if err := json.Unmarshal(data, &cfg); err != nil {
		log.Printf("Warning: Could not parse config file %s: %v", configPath, err)
		return serverConfig{Port: 8080}
	}

	if cfg.Port == 0 {
		cfg.Port = 8080
	}

	return cfg
}

func setupLogging(logPath string) {
	// Check if running under systemd
	isSystemd := os.Getenv("SYSTEMD_LOG_LEVEL") != "" || os.Getenv("JOURNAL_STREAM") != ""

	switch logPath {
	case "journald":
		if isSystemd {
			log.Printf("Logging to journald (detected systemd)")
		} else {
			log.Printf("Warning: --log=journald specified but not running under systemd, falling back to stderr")
			logPath = "stderr"
		}
		fallthrough
	case "stderr":
		log.SetOutput(os.Stderr)
	case "stdout":
		log.SetOutput(os.Stdout)
	default:
		// File path
		f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			log.Printf("Warning: Could not open log file %s: %v, falling back to stderr", logPath, err)
			log.SetOutput(os.Stderr)
		} else {
			log.SetOutput(f)
			log.Printf("Logging to file: %s", logPath)
		}
	}
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

func handleRSS(w http.ResponseWriter, r *http.Request, cache *cache) {
	setCORSHeaders(w)

	url := r.URL.Query().Get("url")
	if url == "" {
		log.Printf("RSS: bad request - missing url parameter")
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing url parameter"})
		return
	}

	// Check cache
	cacheKey := "rss:" + url
	if cached, ok := cache.get(cacheKey); ok {
		log.Printf("RSS: %s [CACHED]", url)
		writeJSON(w, http.StatusOK, cached)
		return
	}

	log.Printf("RSS: fetching %s", url)

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

	response := rssResponse{
		Title: title,
		Items: items,
	}

	// Cache the response
	cache.set(cacheKey, response)

	log.Printf("RSS: fetched %d items from %s", len(items), url)
	writeJSON(w, http.StatusOK, response)
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

func handleGitHub(w http.ResponseWriter, r *http.Request, cache *cache) {
	setCORSHeaders(w)

	org := r.URL.Query().Get("org")
	user := r.URL.Query().Get("user")

	if org == "" && user == "" {
		log.Printf("GitHub: bad request - missing org or user parameter")
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing org or user parameter"})
		return
	}

	// Check cache
	cacheKey := "github:" + org + ":" + user
	if cached, ok := cache.get(cacheKey); ok {
		log.Printf("GitHub: %s [%s] [CACHED]", org, user)
		writeJSON(w, http.StatusOK, cached)
		return
	}

	if org != "" {
		log.Printf("GitHub: fetching PRs for org %s", org)
	} else {
		log.Printf("GitHub: fetching PRs for user %s", user)
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

	response := githubPRResponse{PRs: allPRs}

	// Cache the response
	cache.set(cacheKey, response)

	log.Printf("GitHub: fetched %d PRs for %s [%s]", len(allPRs), org, user)
	writeJSON(w, http.StatusOK, response)
}

func fetchOrgPRs(org string) ([]githubPR, error) {
	url := fmt.Sprintf("https://api.github.com/search/issues?q=type:pr+org:%s+state:open&sort=created&order=desc&per_page=10", org)
	return fetchGitHubSearchAPI(url)
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
	// Define flags
	configPath := flag.String("config", "", "Path to server configuration file (default: ./server.json)")
	dataPath := flag.String("data", "", "Path to data directory (default: current directory)")
	staticPath := flag.String("static", "", "Path to static files directory (default: current directory)")
	logPath := flag.String("log", "journald", "Log output: journald, stderr, stdout, or file path")
	showVersion := flag.Bool("version", false, "Print version and exit")

	flag.Parse()

	// Handle --version
	if *showVersion {
		fmt.Printf("toolbox %s\n", Version)
		os.Exit(0)
	}

	// Load configuration
	cfg := loadConfig(*configPath)

	// Determine paths
	var projectRoot string
	var err error

	if *staticPath != "" {
		projectRoot = *staticPath
	} else if *dataPath != "" {
		projectRoot = *dataPath
	} else {
		// Default: current directory
		projectRoot, err = os.Getwd()
		if err != nil {
			log.Fatal("Failed to get working directory:", err)
		}
	}

	// Setup logging
	setupLogging(*logPath)

	// Create caches with different TTLs
	// RSS feeds: 5 minutes (feeds don't change often)
	rssCache := newCache(5 * time.Minute)
	// GitHub API: 2 minutes (PRs can change more frequently)
	githubCache := newCache(2 * time.Minute)

	// Logging middleware
	httpLogging := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Printf("%s %s", r.Method, r.URL.Path)
			next.ServeHTTP(w, r)
		})
	}

	// Serve static files
	http.Handle("/", httpLogging(http.FileServer(http.Dir(projectRoot))))

	// API routes
	http.HandleFunc("/api/rss", func(w http.ResponseWriter, r *http.Request) {
		handleRSS(w, r, rssCache)
	})
	http.HandleFunc("/api/github/pulls", func(w http.ResponseWriter, r *http.Request) {
		handleGitHub(w, r, githubCache)
	})

	addr := fmt.Sprintf(":%d", cfg.Port)
	log.Printf("Toolbox %s starting on http://localhost%s", Version, addr)
	log.Printf("Static files served from: %s", projectRoot)
	log.Printf("Cache TTLs: RSS=5min, GitHub=2min")

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal("Server failed:", err)
	}
}
