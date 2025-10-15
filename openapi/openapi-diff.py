#!/usr/bin/env python3
"""Compare OpenAPI specs"""

import json
import sys

import yaml


def normalize_spec(data):
    """Remove auto-generated fields for comparison and sort recursively"""
    if isinstance(data, dict):
        return {
            k: normalize_spec(v)
            for k, v in sorted(data.items())
            if k not in ["servers", "x-internal", "title", "description", "default"]
        }
    if isinstance(data, list):
        # Sort lists of dicts by their string representation for stable comparison
        return sorted((normalize_spec(x) for x in data), key=lambda x: str(x))
    return data


def main():
    with open("openapi/spec.yaml") as f:
        manual = yaml.safe_load(f)
    with open("/tmp/openapi-live.json") as f:
        live = json.load(f)

    manual_norm = normalize_spec(manual)
    live_norm = normalize_spec(live)

    print("\n")
    print(manual_norm)
    print("\n")
    print(live_norm)
    print("\n")

    if manual_norm == live_norm:
        print("✓ Specs match!")
        return 0
    else:
        print("⚠️  Specs differ - run 'make openapi-sync' to update")
        return 1


if __name__ == "__main__":
    sys.exit(main())
