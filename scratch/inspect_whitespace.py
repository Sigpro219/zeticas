import os

path = r'c:\Users\Usuario\zeticas\src\pages\Reports.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(520, 535):
    if i < len(lines):
        print(f"{i+1}: {repr(lines[i])}")
