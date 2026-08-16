# Ansible Role: toolbox

Installs and configures Toolbox - a minimal browser start page with terminal aesthetic.

## Requirements

- Ansible 2.10+
- Target host with systemd
- Go (if building from source)

## Role Variables

Default variables are defined in `vars/main.yml`.

| Variable | Default | Description |
|----------|---------|-------------|
| `toolbox_install_dir` | `/opt/toolbox` | Installation directory |
| `toolbox_config_dir` | `/etc/toolbox` | Configuration directory |
| `toolbox_log_dir` | `/var/log/toolbox` | Log directory |
| `toolbox_user` | `toolbox` | Service user |
| `toolbox_group` | `toolbox` | Service group |
| `toolbox_port` | `8080` | Server port |
| `toolbox_version` | `1.0.0` | Version to install |
| `toolbox_binary_url` | - | URL to download binary |
| `toolbox_build_from_source` | `false` | Build from source |
| `toolbox_source_path` | `/opt/toolbox-src` | Source directory |
| `toolbox_service_name` | `toolbox` | Systemd service name |
| `toolbox_service_enabled` | `true` | Enable on boot |
| `toolbox_service_state` | `started` | Service state |
| `toolbox_log_output` | `journald` | Log output destination |
| `github_repo` | `user/toolbox` | GitHub repository |

## Dependencies

None.

## Example Playbook

### Install from release

```yaml
- hosts: all
  roles:
    - role: toolbox
      toolbox_version: "1.0.0"
      toolbox_binary_url: "https://github.com/user/toolbox/releases/download/v1.0.0/toolbox-linux-amd64"
```

### Build from source

```yaml
- hosts: all
  roles:
    - role: toolbox
      toolbox_build_from_source: true
      toolbox_source_path: "/opt/toolbox-src"
      toolbox_version: "main"
```

### Custom configuration

```yaml
- hosts: all
  roles:
    - role: toolbox
      toolbox_port: 8081
      toolbox_config_dir: /etc/custom-toolbox
      toolbox_install_dir: /opt/custom-toolbox
      toolbox_log_output: /var/log/custom-toolbox.log
```

## Testing

### With Docker

```bash
docker run -it --rm -v $(pwd):/etc/ansible/roles/toolbox ansible/ansible:latest bash
ansible-playbook -i localhost, -c local playbook.yml
```

### With Vagrant

```bash
vagrant up
vagrant provision
```

## License

MIT

## Author Information

Created by Toolbox Team
