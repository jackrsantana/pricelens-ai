import re

with open('src/components/DashboardAdmin.tsx', 'r') as f:
    text = f.read()

# Fix empty parenthesis after &&
text = re.sub(r'&& \(\s*\)', '&& null', text)
text = re.sub(r'&& \(\s*\n\s*\)', '&& null', text)

with open('src/components/DashboardAdmin.tsx', 'w') as f:
    f.write(text)
