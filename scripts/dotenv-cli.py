#!/usr/bin/env python3
"""
Dotenv Server CLI Tool
Command-line interface for managing environment variables
"""

import os
import sys
import json
import argparse
import requests
from getpass import getpass
from typing import Optional, Dict, Any
from urllib.parse import urljoin

class DotenvCLI:
    def __init__(self, base_url: str = "http://localhost:8070"):
        self.base_url = base_url
        self.session = requests.Session()
        
    def login(self, namespace: str, environment: str, password: str) -> bool:
        """Authenticate with the server"""
        url = urljoin(self.base_url, f"/{namespace}/{environment}")
        response = self.session.post(url, data={"password": password})
        return response.status_code == 200
    
    def list_variables(self, namespace: str, environment: str) -> Dict[str, str]:
        """List all variables in an environment"""
        url = urljoin(self.base_url, f"/api/{namespace}/{environment}")
        response = self.session.get(url)
        if response.status_code == 200:
            return response.json()
        return {}
    
    def get_variable(self, namespace: str, environment: str, key: str) -> Optional[str]:
        """Get a specific variable value"""
        vars_dict = self.list_variables(namespace, environment)
        return vars_dict.get(key)
    
    def set_variable(self, namespace: str, environment: str, key: str, value: str) -> bool:
        """Set a variable value"""
        url = urljoin(self.base_url, f"/add/{namespace}/{environment}")
        response = self.session.post(url, data={"key": key, "value": value})
        return response.status_code == 200
    
    def delete_variable(self, namespace: str, environment: str, key: str) -> bool:
        """Delete a variable"""
        url = urljoin(self.base_url, f"/delete/{namespace}/{environment}")
        response = self.session.post(url, data={"key": key})
        return response.status_code == 200
    
    def export_env(self, namespace: str, environment: str, format: str = "env") -> str:
        """Export environment variables"""
        url = urljoin(self.base_url, f"/download/{namespace}/{environment}/{format}")
        response = self.session.get(url)
        if response.status_code == 200:
            return response.text
        return ""
    
    def import_env(self, namespace: str, environment: str, file_path: str) -> bool:
        """Import environment variables from file"""
        with open(file_path, 'r') as f:
            content = f.read()
        
        url = urljoin(self.base_url, f"/bulk-replace/{namespace}/{environment}")
        response = self.session.post(url, data={"content": content})
        return response.status_code == 200

def main():
    parser = argparse.ArgumentParser(description="Dotenv Server CLI Tool")
    parser.add_argument("--url", default="http://localhost:8070", help="Server URL")
    parser.add_argument("-n", "--namespace", required=True, help="Namespace")
    parser.add_argument("-e", "--environment", required=True, help="Environment")
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # List command
    subparsers.add_parser("list", help="List all variables")
    
    # Get command
    get_parser = subparsers.add_parser("get", help="Get a variable value")
    get_parser.add_argument("key", help="Variable key")
    
    # Set command
    set_parser = subparsers.add_parser("set", help="Set a variable value")
    set_parser.add_argument("key", help="Variable key")
    set_parser.add_argument("value", help="Variable value")
    
    # Delete command
    delete_parser = subparsers.add_parser("delete", help="Delete a variable")
    delete_parser.add_argument("key", help="Variable key")
    
    # Export command
    export_parser = subparsers.add_parser("export", help="Export variables")
    export_parser.add_argument("--format", choices=["env", "json", "yaml"], default="env", help="Export format")
    export_parser.add_argument("--output", "-o", help="Output file (default: stdout)")
    
    # Import command
    import_parser = subparsers.add_parser("import", help="Import variables from file")
    import_parser.add_argument("file", help="File to import")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Initialize CLI
    cli = DotenvCLI(args.url)
    
    # Authenticate
    password = getpass(f"Password for {args.namespace}/{args.environment}: ")
    if not cli.login(args.namespace, args.environment, password):
        print("❌ Authentication failed", file=sys.stderr)
        sys.exit(1)
    
    # Execute command
    try:
        if args.command == "list":
            variables = cli.list_variables(args.namespace, args.environment)
            if variables:
                print(f"📋 Variables in {args.namespace}/{args.environment}:")
                for key, value in sorted(variables.items()):
                    print(f"  {key}={value}")
            else:
                print("No variables found")
        
        elif args.command == "get":
            value = cli.get_variable(args.namespace, args.environment, args.key)
            if value is not None:
                print(value)
            else:
                print(f"❌ Variable '{args.key}' not found", file=sys.stderr)
                sys.exit(1)
        
        elif args.command == "set":
            if cli.set_variable(args.namespace, args.environment, args.key, args.value):
                print(f"✅ Set {args.key}={args.value}")
            else:
                print(f"❌ Failed to set variable", file=sys.stderr)
                sys.exit(1)
        
        elif args.command == "delete":
            if cli.delete_variable(args.namespace, args.environment, args.key):
                print(f"✅ Deleted {args.key}")
            else:
                print(f"❌ Failed to delete variable", file=sys.stderr)
                sys.exit(1)
        
        elif args.command == "export":
            content = cli.export_env(args.namespace, args.environment, args.format)
            if content:
                if args.output:
                    with open(args.output, 'w') as f:
                        f.write(content)
                    print(f"✅ Exported to {args.output}")
                else:
                    print(content)
            else:
                print(f"❌ Failed to export", file=sys.stderr)
                sys.exit(1)
        
        elif args.command == "import":
            if cli.import_env(args.namespace, args.environment, args.file):
                print(f"✅ Imported from {args.file}")
            else:
                print(f"❌ Failed to import", file=sys.stderr)
                sys.exit(1)
    
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
