import pandas as pd

file_path = "Copy of Cholera Data for CRS 2021.xlsx"
try:
    xl = pd.ExcelFile(file_path)
    print(f"Sheets: {xl.sheet_names}")
    for sheet in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=sheet, nrows=2)
        print(f"\nSheet: {sheet}")
        print(f"Columns: {list(df.columns)}")
except Exception as e:
    print(f"Error: {e}")
