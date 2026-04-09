"""
名言爬虫模块
爬取 https://quotes.toscrape.com/ 网站上的名言数据。
"""

import json
import logging
import time
from typing import Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

BASE_URL = "https://quotes.toscrape.com/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (MeowOne Scraper Bot)",
}


class QuoteScraper:
    """名言爬虫类，负责抓取和解析名言数据。"""

    def __init__(self, base_url: str = BASE_URL, timeout: int = 10):
        """
        初始化爬虫。

        Args:
            base_url: 目标网站的基础 URL。
            timeout: 请求超时时间（秒）。
        """
        self.base_url = base_url
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def fetch_page(self, url: str) -> Optional[str]:
        """
        获取网页 HTML 内容。

        Args:
            url: 目标 URL。

        Returns:
            网页 HTML 字符串，失败时返回 None。
        """
        try:
            logger.info("正在抓取页面: %s", url)
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            logger.error("请求失败: %s — %s", url, e)
            return None

    def parse_quotes(self, html: str) -> list[dict]:
        """
        从 HTML 中解析名言列表。

        每条名言包含：text（内容）、author（作者）、tags（标签列表）。

        Args:
            html: 网页 HTML 字符串。

        Returns:
            名言字典列表。
        """
        soup = BeautifulSoup(html, "html.parser")
        quotes = []

        for quote_div in soup.select("div.quote"):
            text_elem = quote_div.select_one("span.text")
            author_elem = quote_div.select_one("small.author")
            tags_elem = quote_div.select("a.tag")

            if not text_elem or not author_elem:
                continue

            text = text_elem.get_text(strip=True).strip('"')
            author = author_elem.get_text(strip=True)
            tags = [tag.get_text(strip=True) for tag in tags_elem]

            quotes.append({
                "text": text,
                "author": author,
                "tags": tags,
            })

        logger.info("解析到 %d 条名言", len(quotes))
        return quotes

    def get_next_page_url(self, html: str) -> Optional[str]:
        """
        获取下一页的 URL。

        Args:
            html: 网页 HTML 字符串。

        Returns:
            下一页的完整 URL，如果没有下一页则返回 None。
        """
        soup = BeautifulSoup(html, "html.parser")
        next_li = soup.select_one("li.next > a")
        if next_li and next_li.get("href"):
            return urljoin(self.base_url, next_li["href"])
        return None

    def scrape_all(self, max_pages: int = 3, delay: float = 0.5) -> list[dict]:
        """
        爬取多页名言数据。

        Args:
            max_pages: 最大爬取页数。
            delay: 每页之间的延迟（秒），避免请求过快。

        Returns:
            所有名言的列表。
        """
        all_quotes: list[dict] = []
        url = self.base_url

        for page in range(1, max_pages + 1):
            html = self.fetch_page(url)
            if html is None:
                logger.warning("无法获取页面 %d，停止抓取", page)
                break

            quotes = self.parse_quotes(html)
            all_quotes.extend(quotes)

            url = self.get_next_page_url(html)
            if url is None:
                logger.info("没有更多页面，抓取完成")
                break

            if page < max_pages:
                time.sleep(delay)

        logger.info("共爬取 %d 条名言（%d 页）", len(all_quotes), page)
        return all_quotes

    def save_to_json(self, quotes: list[dict], filepath: str) -> None:
        """
        将名言数据保存为 JSON 文件。

        Args:
            quotes: 名言列表。
            filepath: 输出文件路径。
        """
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(quotes, f, ensure_ascii=False, indent=2)
        logger.info("数据已保存到: %s", filepath)


def main():
    """主入口函数。"""
    scraper = QuoteScraper()
    quotes = scraper.scrape_all(max_pages=3)
    output_file = "scraper/quotes.json"
    scraper.save_to_json(quotes, output_file)

    # 打印前 3 条作为预览
    print(f"\n共爬取 {len(quotes)} 条名言，预览前 3 条：\n")
    for i, q in enumerate(quotes[:3], 1):
        print(f"  {i}. \"{q['text']}\" — {q['author']}")
        print(f"     标签: {', '.join(q['tags'])}")
        print()


if __name__ == "__main__":
    main()
