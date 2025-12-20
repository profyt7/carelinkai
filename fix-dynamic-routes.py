#!/usr/bin/env python3
"""
Script to add dynamic export to all API routes that don't have it
"""

import os
import re
from pathlib import Path

DYNAMIC_EXPORT = """// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

"""

def fix_route_file(file_path):
    """Add dynamic export to a route file if it doesn't have one"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if already has dynamic export
        if 'export const dynamic' in content:
            return 'skipped'
        
        # Add dynamic export at the top (after any comments)
        # Find the first non-comment, non-empty line
        lines = content.split('\n')
        insert_index = 0
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            # Skip empty lines and comment lines
            if stripped and not stripped.startswith('//') and not stripped.startswith('/*') and not stripped.startswith('*'):
                insert_index = i
                break
        
        # Insert the dynamic export
        new_content = '\n'.join(lines[:insert_index]) + '\n' + DYNAMIC_EXPORT + '\n'.join(lines[insert_index:])
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        return 'fixed'
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return 'error'

def main():
    """Main function"""
    api_dir = Path('src/app/api')
    
    if not api_dir.exists():
        print("Error: src/app/api directory not found")
        return
    
    route_files = list(api_dir.rglob('route.ts'))
    
    print(f"Found {len(route_files)} API route files")
    print("")
    
    stats = {'fixed': 0, 'skipped': 0, 'error': 0}
    
    for route_file in route_files:
        result = fix_route_file(route_file)
        stats[result] += 1
        
        if result == 'fixed':
            print(f"✅ Fixed: {route_file}")
        elif result == 'error':
            print(f"❌ Error: {route_file}")
    
    print("")
    print("=" * 70)
    print("Summary:")
    print(f"  Fixed: {stats['fixed']} files")
    print(f"  Skipped: {stats['skipped']} files (already had dynamic export)")
    print(f"  Errors: {stats['error']} files")
    print("=" * 70)

if __name__ == '__main__':
    main()
