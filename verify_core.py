from playwright.sync_api import sync_playwright
import time

def verify_core_features():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8080")

        # 1. Verify Start Today button
        start_btn = page.locator("#start-today")
        if start_btn.count() > 0:
            print("Start button found.")
            start_btn.click()
            # Can't easily verify scroll, but if no error, good.
        else:
            print("Start button not found.")

        # 2. Verify Progress Form
        # Fill form
        page.select_option("#variation", "tuck")
        page.fill("#hold-time", "15")
        page.fill("#sets", "3")
        page.fill("#rpe", "8")

        # Submit
        page.click("#progress-form button[type='submit']")

        # Check history
        time.sleep(1)
        history_list = page.locator("#history-list")
        if "Tuck" in history_list.text_content() and "15s" in history_list.text_content():
             print("Session logged successfully.")
        else:
             print("Session logging failed!")

        # 3. Verify Coach Chat
        # Fill coach input
        page.fill("#coach-input", "Test question")
        page.click("#coach-form button[type='submit']")

        time.sleep(1)
        chat_log = page.locator("#chat-log")
        if "Test question" in chat_log.text_content():
            print("Chat message sent successfully.")
        else:
            print("Chat message sending failed!")

        browser.close()

if __name__ == "__main__":
    verify_core_features()
