import csv

def generate_predefined_colors(n):
    step = int((256 * 256 * 256) ** (1 / 3) / n ** (1 / 3))
    colors = []
    
    for r in range(0, 256, step):
        for g in range(0, 256, step):
            for b in range(0, 256, step):
                if len(colors) >= n:
                    return colors
                colors.append(f"#{r:02x}{g:02x}{b:02x}")

    return colors

def main():
    n = 8000  # 需要的颜色数量
    colors = generate_predefined_colors(n)

    with open('color.csv', 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        for color in colors:
            writer.writerow([color])

if __name__ == "__main__":
    main()
