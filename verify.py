from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        try:
            page.goto("http://localhost:8080")
            print("Page loaded")

            page.wait_for_timeout(1000)

            if page.is_visible("#api-modal"):
                print("Modal visible, filling key...")
                page.fill("#api-key-modal", "gsk_dummy_key_for_test")
                page.evaluate("document.getElementById('api-key-form').requestSubmit()")
                page.wait_for_timeout(500)

            # Verify form is visible
            page.wait_for_selector("#progress-form")

            # Add a session
            page.select_option("#variation", "tuck")
            page.fill("#hold-time", "15")
            page.fill("#sets", "3")
            page.fill("#rpe", "8")
            print("Submitting progress form...")
            page.evaluate("document.getElementById('progress-form').requestSubmit()")

            # Verify it appears in history
            # Now the list should have items, so it should be visible (non-zero height)
            page.wait_for_selector("#history-list li")
            history_text = page.locator("#history-list li").first.text_content()
            print(f"History item: {history_text}")

            if "Tuck" in history_text and "15s" in history_text:
                print("Session added successfully")
            else:
                print("Session add failed or text mismatch")

            # Verify milestones
            page.wait_for_selector(".milestone")
            milestones = page.locator(".milestone").count()
            print(f"Milestones found: {milestones}")

            # Screenshot
            page.screenshot(path="verification.png")
            print("Screenshot saved to verification.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app()
