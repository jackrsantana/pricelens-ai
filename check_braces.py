with open('src/components/DashboardAdmin.tsx', 'r') as f:
    text = f.read()

count = 0
for i, c in enumerate(text):
    if c == '{': count += 1
    elif c == '}': count -= 1
    if count < 0:
        print(f"Extra closing brace at position {i}")
        break
print("Final count:", count)
