"""Utility script to inspect Excel file structure."""
import argparse
import pandas as pd


def inspect_excel(file_path: str) -> None:
    """Inspect an Excel file and print its structure."""
    try:
        xl = pd.ExcelFile(file_path)
        print(f"Sheets: {xl.sheet_names}")
        for sheet in xl.sheet_names:
            df = pd.read_excel(xl, sheet_name=sheet, nrows=2)
            print(f"\nSheet: {sheet}")
            print(f"Columns: {list(df.columns)}")
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}")
    except ValueError as e:
        print(f"Error reading Excel file: {e}")


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Inspect Excel file structure")
    parser.add_argument("file_path", nargs="?", default="Copy of Cholera Data for CRS 2021.xlsx",
                        help="Path to the Excel file")
    args = parser.parse_args()
    inspect_excel(args.file_path)


if __name__ == "__main__":
    main()
