"""
名言爬虫测试模块。
包含单元测试和集成测试。
"""

import json
import os
import unittest
from unittest.mock import patch, MagicMock

from scraper.quote_scraper import QuoteScraper


# ---------- 模拟的 HTML 数据 ----------
SAMPLE_HTML = """
<html>
<body>
<div class="row">
    <div class="quote" itemscope itemtype="http://schema.org/CreativeWork">
        <span class="text" itemprop="text">"The world as we have created it is a process of our thinking. It cannot be changed without changing our thinking."</span>
        <span>by <small class="author" itemprop="author">Albert Einstein</small></span>
        <div class="tags">
            Tags:
            <a class="tag" href="/tag/change/page/1/">change</a>
            <a class="tag" href="/tag/deep-thoughts/page/1/">deep-thoughts</a>
        </div>
    </div>
    <div class="quote" itemscope itemtype="http://schema.org/CreativeWork">
        <span class="text" itemprop="text">"It is our choices, Harry, that show what we truly are, far more than our abilities."</span>
        <span>by <small class="author" itemprop="author">J.K. Rowling</small></span>
        <div class="tags">
            Tags:
            <a class="tag" href="/tag/abilities/page/1/">abilities</a>
            <a class="tag" href="/tag/choices/page/1/">choices</a>
        </div>
    </div>
</div>
<ul class="pager">
    <li class="next"><a href="/page/2/">Next <span aria-hidden="true">&rarr;</span></a></li>
</ul>
</body>
</html>
"""

SAMPLE_HTML_NO_NEXT = """
<html>
<body>
<div class="row">
    <div class="quote">
        <span class="text">"Test quote."</span>
        <span>by <small class="author">Test Author</small></span>
    </div>
</div>
</body>
</html>
"""


class TestQuoteParser(unittest.TestCase):
    """测试名言解析功能。"""

    def setUp(self):
        self.scraper = QuoteScraper()

    def test_parse_quotes_returns_list(self):
        """parse_quotes 应返回一个列表。"""
        quotes = self.scraper.parse_quotes(SAMPLE_HTML)
        self.assertIsInstance(quotes, list)
        self.assertEqual(len(quotes), 2)

    def test_parse_quotes_content(self):
        """验证解析出的名言内容是否正确。"""
        quotes = self.scraper.parse_quotes(SAMPLE_HTML)
        self.assertIn("The world as we have created", quotes[0]["text"])
        self.assertEqual(quotes[0]["author"], "Albert Einstein")
        self.assertIn("change", quotes[0]["tags"])
        self.assertIn("deep-thoughts", quotes[0]["tags"])

    def test_parse_quotes_second_item(self):
        """验证第二条名言。"""
        quotes = self.scraper.parse_quotes(SAMPLE_HTML)
        self.assertIn("choices", quotes[1]["text"])
        self.assertEqual(quotes[1]["author"], "J.K. Rowling")

    def test_parse_empty_html(self):
        """空 HTML 应返回空列表。"""
        quotes = self.scraper.parse_quotes("<html></html>")
        self.assertEqual(quotes, [])

    def test_get_next_page_url(self):
        """验证获取下一页 URL。"""
        url = self.scraper.get_next_page_url(SAMPLE_HTML)
        self.assertIsNotNone(url)
        self.assertIn("/page/2/", url)

    def test_get_next_page_url_none(self):
        """没有下一页时应返回 None。"""
        url = self.scraper.get_next_page_url(SAMPLE_HTML_NO_NEXT)
        self.assertIsNone(url)


class TestSaveToJson(unittest.TestCase):
    """测试 JSON 保存功能。"""

    def setUp(self):
        self.scraper = QuoteScraper()
        self.test_file = "scraper/test_quotes.json"
        self.sample_data = [
            {"text": "Hello", "author": "World", "tags": ["test"]},
        ]

    def tearDown(self):
        # 清理测试文件
        if os.path.exists(self.test_file):
            os.remove(self.test_file)

    def test_save_to_json_creates_file(self):
        """保存后文件应存在。"""
        self.scraper.save_to_json(self.sample_data, self.test_file)
        self.assertTrue(os.path.exists(self.test_file))

    def test_save_to_json_content(self):
        """保存的内容应与输入一致。"""
        self.scraper.save_to_json(self.sample_data, self.test_file)
        with open(self.test_file, "r", encoding="utf-8") as f:
            loaded = json.load(f)
        self.assertEqual(loaded, self.sample_data)


class TestFetchPage(unittest.TestCase):
    """测试网页抓取功能（使用 mock）。"""

    @patch("scraper.quote_scraper.requests.Session.get")
    def test_fetch_page_success(self, mock_get):
        """成功请求应返回 HTML。"""
        mock_response = MagicMock()
        mock_response.text = "<html><body>Hello</body></html>"
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        scraper = QuoteScraper()
        result = scraper.fetch_page("http://example.com")
        self.assertEqual(result, "<html><body>Hello</body></html>")

    @patch("scraper.quote_scraper.requests.Session.get")
    def test_fetch_page_failure(self, mock_get):
        """请求失败应返回 None。"""
        import requests
        mock_get.side_effect = requests.RequestException("Network error")

        scraper = QuoteScraper()
        result = scraper.fetch_page("http://example.com")
        self.assertIsNone(result)


class TestScrapeAll(unittest.TestCase):
    """测试多页爬取功能（使用 mock）。"""

    @patch("time.sleep")
    @patch.object(QuoteScraper, "fetch_page")
    @patch.object(QuoteScraper, "parse_quotes")
    @patch.object(QuoteScraper, "get_next_page_url")
    def test_scrape_all_two_pages(
        self, mock_next, mock_parse, mock_fetch, mock_sleep
    ):
        """模拟爬取两页数据。"""
        mock_fetch.side_effect = [SAMPLE_HTML, SAMPLE_HTML_NO_NEXT]
        mock_parse.side_effect = [
            [{"text": "Q1", "author": "A1", "tags": ["t1"]}],
            [{"text": "Q2", "author": "A2", "tags": ["t2"]}],
        ]
        mock_next.side_effect = ["http://example.com/page/2/", None]

        scraper = QuoteScraper()
        result = scraper.scrape_all(max_pages=3)

        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["text"], "Q1")
        self.assertEqual(result[1]["text"], "Q2")
        self.assertEqual(mock_fetch.call_count, 2)


if __name__ == "__main__":
    unittest.main()
