#!/usr/bin/env python3
"""
简单的 Python 爬虫示例
爬取 https://quotes.toscrape.com/ 网站上的名言数据
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import sys


def scrape_quotes(base_url="https://quotes.toscrape.com/", max_pages=3):
    """
    爬取名言网站，提取名言文本、作者和标签。

    Args:
        base_url: 目标网站 URL
        max_pages: 最大爬取页数

    Returns:
        list: 包含名言字典的列表
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }

    all_quotes = []
    current_url = base_url

    for page in range(1, max_pages + 1):
        print(f"正在爬取第 {page} 页: {current_url}")

        try:
            response = requests.get(current_url, headers=headers, timeout=15)
            response.raise_for_status()  # 检查 HTTP 错误

            soup = BeautifulSoup(response.text, "html.parser")
            quotes_divs = soup.find_all("div", class_="quote")

            if not quotes_divs:
                print(f"  第 {page} 页没有找到名言，停止爬取。")
                break

            for div in quotes_divs:
                quote_text = div.find("span", class_="text")
                author = div.find("small", class_="author")
                tags = div.find_all("a", class_="tag")

                if quote_text and author:
                    quote_data = {
                        "text": quote_text.get_text(strip=True),
                        "author": author.get_text(strip=True),
                        "tags": [tag.get_text(strip=True) for tag in tags],
                    }
                    all_quotes.append(quote_data)

            print(f"  第 {page} 页成功提取 {len(quotes_divs)} 条名言")

            # 查找下一页链接
            next_link = soup.find("li", class_="next")
            if next_link:
                next_href = next_link.find("a")["href"]
                current_url = base_url.rstrip("/") + "/" + next_href.lstrip("/")
            else:
                print("  没有更多页面了。")
                break

            # 礼貌爬取：等待 1 秒
            time.sleep(1)

        except requests.exceptions.RequestException as e:
            print(f"  请求出错: {e}")
            break
        except Exception as e:
            print(f"  解析出错: {e}")
            break

    return all_quotes


def save_to_json(data, filename="quotes.json"):
    """将数据保存为 JSON 文件"""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n数据已保存到 {filename}")


def save_to_csv(data, filename="quotes.csv"):
    """将数据保存为 CSV 文件"""
    import csv

    if not data:
        return

    fieldnames = ["text", "author", "tags"]
    with open(filename, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in data:
            row_copy = row.copy()
            row_copy["tags"] = "; ".join(row["tags"])
            writer.writerow(row_copy)
    print(f"数据已保存到 {filename}")


def main():
    print("=" * 60)
    print("名言爬虫 - 开始运行")
    print("=" * 60)

    quotes = scrape_quotes(max_pages=3)

    if quotes:
        print(f"\n总共爬取了 {len(quotes)} 条名言！")

        # 展示前 5 条
        print("\n--- 前 5 条名言 ---")
        for i, q in enumerate(quotes[:5], 1):
            print(f"\n{i}. \"{q['text']}\"")
            print(f"   作者: {q['author']}")
            print(f"   标签: {', '.join(q['tags'])}")

        # 保存数据
        save_to_json(quotes)

        # 统计信息
        authors = set(q["author"] for q in quotes)
        all_tags = set()
        for q in quotes:
            all_tags.update(q["tags"])
        print(f"\n--- 统计信息 ---")
        print(f"作者数量: {len(authors)}")
        print(f"标签种类: {len(all_tags)}")
        print(f"热门标签: {', '.join(list(all_tags)[:10])}")
    else:
        print("未能爬取到任何数据。")

    return quotes


if __name__ == "__main__":
    main()
