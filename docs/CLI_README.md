# Dotenv Server CLI Tool

A command-line interface for managing environment variables on the Dotenv Server.

## Installation

```bash
pip install requests
chmod +x dotenv-cli.py
```

## Usage

### Authentication
All commands require authentication. You'll be prompted for the password.

### List all variables
```bash
python dotenv-cli.py -n production -e main list
```

### Get a specific variable
```bash
python dotenv-cli.py -n production -e main get DATABASE_URL
```

### Set a variable
```bash
python dotenv-cli.py -n production -e main set API_KEY "your-secret-key"
```

### Delete a variable
```bash
python dotenv-cli.py -n production -e main delete OLD_VAR
```

### Export variables
```bash
# Export to stdout
python dotenv-cli.py -n production -e main export

# Export to file
python dotenv-cli.py -n production -e main export -o .env

# Export as JSON
python dotenv-cli.py -n production -e main export --format json -o vars.json
```

### Import variables
```bash
python dotenv-cli.py -n production -e main import .env
```

### Custom server URL
```bash
python dotenv-cli.py --url https://your-server.com -n production -e main list
```

## Examples

```bash
# Backup production environment
python dotenv-cli.py -n production -e main export -o backup.env

# Copy variables from one environment to another
python dotenv-cli.py -n production -e main export -o temp.env
python dotenv-cli.py -n production -e staging import temp.env

# Quick variable lookup
python dotenv-cli.py -n production -e main get SECRET_KEY
```
