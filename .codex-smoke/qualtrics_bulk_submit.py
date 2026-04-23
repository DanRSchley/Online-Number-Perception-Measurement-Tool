import json
import random
import sys
import time
from datetime import datetime, UTC
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import StaleElementReferenceException, TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


SURVEY_URL = "https://erasmusuniversity.eu.qualtrics.com/jfe/form/SV_29WyXqaRnoTGuEe"
CHROME_BINARY = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
CHROMEDRIVER = r"C:\Users\Schley\.cache\selenium\chromedriver\win64\147.0.7727.57\chromedriver.exe"


def make_driver(headless=True):
    options = Options()
    options.binary_location = CHROME_BINARY
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1600,2200")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--log-level=3")
    return webdriver.Chrome(service=Service(CHROMEDRIVER), options=options)


def visible_elements(driver, xpath):
    out = []
    for el in driver.find_elements(By.XPATH, xpath):
        try:
            if el.is_displayed():
                out.append(el)
        except StaleElementReferenceException:
            pass
    return out


def safe_body_text(driver):
    try:
        return driver.find_element(By.TAG_NAME, "body").text.strip()
    except Exception:
        return ""


def set_text_input(driver, element, value):
    driver.execute_script(
        """
        arguments[0].focus();
        arguments[0].value = '';
        arguments[0].value = arguments[1];
        arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
        arguments[0].dispatchEvent(new Event('change', { bubbles: true }));
        """,
        element,
        str(value),
    )


def click_button_with_labels(driver, labels):
    buttons = visible_elements(driver, "//button | //input[@type='button'] | //input[@type='submit']")
    for button in buttons:
        text = (button.text or button.get_attribute("value") or "").strip()
        if any(label in text for label in labels):
            driver.execute_script("arguments[0].click();", button)
            return True
    return False


def click_next_if_present(driver):
    for button in visible_elements(driver, "//input[@id='NextButton']"):
        if button.is_enabled():
            driver.execute_script("arguments[0].click();", button)
            return True
    return False


def classify_task_from_intro(text):
    if "Dot Estimation Task" in text:
        if "one group of dots at a time" in text and "disappear" in text:
            return "numerosity_separate_brief"
        if "one group of dots at a time" in text and "stay on the screen" in text:
            return "numerosity_separate_visible"
        if "groups of dots on each screen" in text and "disappear" in text:
            return "numerosity_joint_brief"
        if "groups of dots on each screen" in text and "stay on the screen" in text:
            return "numerosity_joint_visible"
    if "Proportion Judgment Task" in text:
        if "one bar at a time" in text:
            return "proportion_separate_evaluation"
        if "one bar split into" in text and "add up to 100" in text:
            return "proportion_joint_evaluation_constsum"
        if "one bar split into" in text:
            return "proportion_joint_evaluation"
    return "unknown"


def inject_completion_listener(driver):
    driver.execute_script(
        """
        window.__codex_bulk_complete = false;
        if (!window.__codexBulkCompleteInstalled) {
          window.addEventListener('behavioral-experiment:complete', function () {
            window.__codex_bulk_complete = true;
          });
          window.__codexBulkCompleteInstalled = true;
        }
        """
    )


def app_completed(driver):
    try:
        return bool(driver.execute_script("return !!window.__codex_bulk_complete;"))
    except Exception:
        return False


def fill_wealth_question(driver, text, rng):
    trillion_mapping = {
        "Top 20%": 100,
        "Second 20%": 70,
        "Middle 20%": 45,
        "Fourth 20%": 20,
        "Bottom 20%": 5,
    }
    share_mapping = {
        "Top 20%": 58,
        "Second 20%": 23,
        "Middle 20%": 11,
        "Fourth 20%": 6,
        "Bottom 20%": 2,
    }
    mapping = share_mapping if "What percentage of total wealth is owned by this group?" in text else trillion_mapping
    value = list(mapping.values())[0]
    for key, candidate in mapping.items():
        if key in text:
            value = candidate
            break
    value += rng.randint(-2, 2)
    inputs = visible_elements(driver, "//input[not(@type) or @type='text' or @type='number' or @type='tel']")
    for el in inputs:
        if el.is_enabled():
            set_text_input(driver, el, max(0, value))


def fill_pre_app_inputs(driver, text, rng):
    inputs = [
        el
        for el in visible_elements(driver, "//input[not(@type) or @type='text' or @type='number' or @type='tel']")
        if el.is_enabled()
    ]
    if not inputs:
        return False
    if "wealth" in text.lower():
        descending = [58, 24, 11, 5, 2]
        for idx, el in enumerate(inputs):
            base = descending[min(idx, len(descending) - 1)]
            set_text_input(driver, el, max(0, base + rng.randint(-3, 3)))
    else:
        for idx, el in enumerate(inputs):
            set_text_input(driver, el, 10 + idx + rng.randint(0, 20))
    return True


def random_partition_100(n, rng):
    if n <= 1:
        return [100]
    cuts = sorted(rng.randint(0, 100) for _ in range(n - 1))
    points = [0] + cuts + [100]
    values = [points[i + 1] - points[i] for i in range(n)]
    rng.shuffle(values)
    return values


def fill_app_inputs(driver, task, rng):
    inputs = [
        el
        for el in visible_elements(driver, "//input[not(@type) or @type='text' or @type='number' or @type='tel']")
        if el.is_enabled()
    ]
    if not inputs:
        return 0

    if task == "proportion_joint_evaluation_constsum":
        values = random_partition_100(len(inputs), rng)
    elif task.startswith("proportion_joint"):
        values = [rng.randint(0, 100) for _ in range(len(inputs))]
    elif task.startswith("proportion"):
        values = [rng.randint(0, 100) for _ in range(len(inputs))]
    elif task.startswith("numerosity_joint"):
        start = rng.randint(20, 55)
        step = rng.randint(3, 10)
        values = [max(1, start + step * idx + rng.randint(-4, 4)) for idx in range(len(inputs))]
    else:
        values = [max(1, rng.randint(15, 85)) for _ in range(len(inputs))]

    for el, value in zip(inputs, values):
        set_text_input(driver, el, value)
    return len(inputs)


def fill_generic_qualtrics_question(driver, rng):
    radios = [el for el in visible_elements(driver, "//input[@type='radio']") if el.is_enabled()]
    if radios:
        driver.execute_script("arguments[0].click();", rng.choice(radios))
        return True
    checks = [el for el in visible_elements(driver, "//input[@type='checkbox']") if el.is_enabled() and not el.is_selected()]
    if checks:
        driver.execute_script("arguments[0].click();", checks[0])
        return True
    texts = [
        el
        for el in visible_elements(driver, "//input[not(@type) or @type='text' or @type='number' or @type='tel']")
        if el.is_enabled()
    ]
    if texts:
        for idx, el in enumerate(texts):
            set_text_input(driver, el, rng.randint(5, 95) + idx)
        return True
    return False


def wait_for_page(driver):
    try:
        WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    except TimeoutException:
        pass


def run_once(driver, run_id, rng):
    driver.get(SURVEY_URL)
    wait_for_page(driver)
    time.sleep(1)

    result = {
        "run_id": run_id,
        "task": None,
        "status": "unknown",
        "started_at": datetime.now(UTC).isoformat(),
    }

    stage = "pre_app"

    for _ in range(400):
        text = safe_body_text(driver)
        if not text:
            time.sleep(0.3)
            continue

        if stage == "pre_app":
            if "Welcome. Before taking part in this study" in text:
                click_next_if_present(driver)
                time.sleep(0.5)
                continue
            if "In this task, you will estimate how wealth is distributed" in text:
                click_next_if_present(driver)
                time.sleep(0.5)
                continue
            if "Trillions of dollars of wealth per group" in text or "Wealth share (%) for one group" in text:
                fill_wealth_question(driver, text, rng)
                click_next_if_present(driver)
                time.sleep(0.5)
                continue
            if fill_pre_app_inputs(driver, text, rng):
                click_next_if_present(driver)
                time.sleep(0.5)
                continue
            if "Dot Estimation Task" in text or "Proportion Judgment Task" in text:
                result["task"] = classify_task_from_intro(text)
                inject_completion_listener(driver)
                stage = "app"
                click_button_with_labels(driver, ["Begin"])
                time.sleep(0.5)
                continue

        if stage == "app":
            if app_completed(driver):
                stage = "post_app"
                time.sleep(0.5)
                continue

            if "Let's do one quick practice round" in text:
                click_button_with_labels(driver, ["Start Practice", "Start"])
                time.sleep(0.5)
                continue
            if "Nice, you're ready" in text:
                click_button_with_labels(driver, ["Start", "Continue"])
                time.sleep(0.5)
                continue

            visible_inputs = [
                el
                for el in visible_elements(driver, "//input[not(@type) or @type='text' or @type='number' or @type='tel']")
                if el.is_enabled()
            ]
            if visible_inputs:
                fill_app_inputs(driver, result["task"] or "", rng)
                click_button_with_labels(driver, ["Continue"])
                time.sleep(0.5)
                continue

            if click_button_with_labels(driver, ["Begin", "Start Practice", "Start", "Continue"]):
                time.sleep(0.5)
                continue

            if "Thank you" in text or "recorded" in text:
                result["status"] = "completed"
                break

            # Wait through timed fixation / stimulus screens and auto-advance pages.
            time.sleep(1.1)

        if stage == "post_app":
            if fill_generic_qualtrics_question(driver, rng):
                time.sleep(0.2)
            if click_next_if_present(driver):
                time.sleep(0.5)
                continue
            if "Thank you" in text or "recorded" in text:
                result["status"] = "completed"
                break
            if "Powered by Qualtrics" in text and ("→" in text or "Next" in text):
                # End-of-survey blank page still showing next button.
                click_next_if_present(driver)
                time.sleep(0.5)
                continue
            time.sleep(0.5)

    if result["status"] == "unknown":
        result["status"] = "completed" if ("Thank you" in safe_body_text(driver) or "recorded" in safe_body_text(driver)) else "incomplete"
    result["finished_at"] = datetime.now(UTC).isoformat()
    return result


def read_existing_count(path):
    if not path.exists():
        return 0
    count = 0
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                count += 1
    return count


def append_result(path, result):
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(result) + "\n")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(".codex-smoke") / "bulk_submit_log.jsonl"
    headless = True
    extra_args = sys.argv[3:]
    if "--show" in extra_args:
        headless = False
        extra_args = [arg for arg in extra_args if arg != "--show"]
    seed = int(extra_args[0]) if extra_args else int(time.time())
    rng = random.Random(seed)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    existing = read_existing_count(out_path)

    driver = make_driver(headless=headless)
    try:
        for idx in range(runs):
            run_id = existing + idx + 1
            result = run_once(driver, run_id, rng)
            append_result(out_path, result)
            print(json.dumps(result), flush=True)
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
