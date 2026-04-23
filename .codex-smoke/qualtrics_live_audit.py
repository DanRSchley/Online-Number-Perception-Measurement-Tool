import json
import sys
import time
from collections import Counter
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import JavascriptException, StaleElementReferenceException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By


SURVEY_URL = "https://erasmusuniversity.eu.qualtrics.com/jfe/form/SV_29WyXqaRnoTGuEe"
CHROME_BINARY = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
CHROMEDRIVER = r"C:\Users\Schley\.cache\selenium\chromedriver\win64\147.0.7727.57\chromedriver.exe"

RUNTIME_FIELDS = {
    "joint_trials": 5,
    "separate_trials": 10,
    "arrays": 6,
    "boxes": 5,
    "numerosity_range": "20-80",
    "brief_display_ms": 1000,
}


def make_driver(headless=True):
    options = Options()
    options.binary_location = CHROME_BINARY
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1600,2200")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
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


def click_if_present(driver, labels):
    buttons = visible_elements(driver, "//button | //input[@type='button'] | //input[@type='submit']")
    for button in buttons:
        text = (button.text or button.get_attribute("value") or "").strip()
        if any(label in text for label in labels):
            driver.execute_script("arguments[0].click();", button)
            return text
    return None


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


def inject_capture_listener(driver):
    script = """
      window.__codex_capture = null;
      window.__codex_capture_meta = { screenTexts: [] };
      if (!window.__codexCaptureInstalled) {
        window.addEventListener('behavioral-experiment:complete', function (event) {
          try {
            window.__codex_capture = JSON.stringify(event.detail);
          } catch (err) {
            window.__codex_capture = JSON.stringify({ error: String(err) });
          }
        });
        window.__codexCaptureInstalled = true;
      }
    """
    driver.execute_script(script)


def get_capture(driver):
    try:
        payload = driver.execute_script("return window.__codex_capture || null;")
    except JavascriptException:
        return None
    if not payload:
        return None
    return json.loads(payload)


def record_seen_text(seen_texts, text):
    short = " | ".join(line.strip() for line in text.splitlines() if line.strip())
    if short and (not seen_texts or seen_texts[-1] != short):
        seen_texts.append(short[:1000])


def fill_wealth_question(driver, text):
    trillion_mapping = {
        "Top 20%": 100,
        "Second 20%": 80,
        "Middle 20%": 60,
        "Fourth 20%": 40,
        "Bottom 20%": 20,
    }
    share_mapping = {
        "Top 20%": 60,
        "Second 20%": 20,
        "Middle 20%": 12,
        "Fourth 20%": 6,
        "Bottom 20%": 2,
    }
    mapping = share_mapping if "What percentage of total wealth is owned by this group?" in text else trillion_mapping
    value = list(mapping.values())[0]
    for key, candidate in mapping.items():
        if key in text:
            value = candidate
            break
    inputs = visible_elements(driver, "//input[not(@type) or @type='text' or @type='number' or @type='tel']")
    for el in inputs:
        if el.is_enabled():
            set_text_input(driver, el, value)


def fill_pre_app_inputs(driver, text):
    inputs = [
        el
        for el in visible_elements(driver, "//input[not(@type) or @type='text' or @type='number' or @type='tel']")
        if el.is_enabled()
    ]
    if not inputs:
        return False
    if "wealth" in text.lower():
        descending = [60, 20, 12, 6, 2]
        for idx, el in enumerate(inputs):
            set_text_input(driver, el, descending[min(idx, len(descending) - 1)])
    else:
        for idx, el in enumerate(inputs):
            set_text_input(driver, el, 20 + idx)
    return True


def fill_app_inputs(driver, task):
    inputs = [
        el
        for el in visible_elements(driver, "//input[not(@type) or @type='text' or @type='number' or @type='tel']")
        if el.is_enabled()
    ]
    if not inputs:
        return 0
    if task == "proportion_joint_evaluation_constsum":
        values = [20] * len(inputs)
        values[-1] += 100 - sum(values)
    elif task.startswith("proportion"):
        values = [20] * len(inputs)
    elif task.startswith("numerosity_joint"):
        values = [25 + (idx * 5) for idx in range(len(inputs))]
    else:
        values = [40] * len(inputs)
    for el, value in zip(inputs, values):
        set_text_input(driver, el, value)
    return len(inputs)


def fill_generic_qualtrics_question(driver):
    radios = [el for el in visible_elements(driver, "//input[@type='radio']") if el.is_enabled()]
    if radios:
        driver.execute_script("arguments[0].click();", radios[0])
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
            set_text_input(driver, el, 20 + idx)
        return True
    return False


def summarize_capture(result, capture):
    detail = capture or {}
    rows = detail.get("rows") or []
    metadata = detail.get("metadata") or {}
    result["capture_metadata"] = metadata
    result["experiment_title"] = metadata.get("settings_used", {}).get("experiment", {}).get("title")
    result["qualtrics_override_task"] = metadata.get("qualtrics_overrides", {}).get("task")
    result["capture_row_count"] = len(rows)
    result["capture_practice_rows"] = sum(1 for row in rows if row.get("practice"))
    result["capture_scored_rows"] = sum(1 for row in rows if not row.get("practice"))
    result["capture_task_counts"] = Counter(row.get("task", "missing") for row in rows)
    trial_keys = []
    for row in rows:
        if row.get("practice"):
            continue
        key = row.get("trial_set_id") or row.get("screen_index") or row.get("trial_id") or row.get("stimulus_id")
        trial_keys.append(key)
    result["distinct_scored_units"] = len({key for key in trial_keys if key is not None})

    task = result["task"]
    if result["experiment_title"] == "Combined Numerosity and Proportion Session":
        result["issues"].append(
            f"{task}: live app loaded combined-session config instead of a single-task config."
        )
        if result["qualtrics_override_task"] and result["qualtrics_override_task"] != task:
            result["issues"].append(
                f"{task}: qualtrics_overrides.task was {result['qualtrics_override_task']} in metadata."
            )
        return

    if task.startswith("numerosity_joint") or task.startswith("proportion_joint"):
        expected_units = RUNTIME_FIELDS["joint_trials"]
    else:
        expected_units = RUNTIME_FIELDS["separate_trials"]

    if task.startswith("numerosity_joint"):
        expected_rows = RUNTIME_FIELDS["arrays"] * (expected_units + 1)
        expected_practice_rows = RUNTIME_FIELDS["arrays"]
    elif task.startswith("proportion_joint"):
        expected_rows = RUNTIME_FIELDS["boxes"] * (expected_units + 1)
        expected_practice_rows = RUNTIME_FIELDS["boxes"]
    else:
        expected_rows = expected_units + 1
        expected_practice_rows = 1

    result["expected_scored_units"] = expected_units
    result["expected_total_rows"] = expected_rows
    result["expected_practice_rows"] = expected_practice_rows

    if result["capture_row_count"] != expected_rows:
        result["issues"].append(
            f"{task}: expected {expected_rows} total logged rows including practice, observed {result['capture_row_count']}."
        )
    if result["capture_practice_rows"] != expected_practice_rows:
        result["issues"].append(
            f"{task}: expected {expected_practice_rows} practice rows, observed {result['capture_practice_rows']}."
        )
    if result["distinct_scored_units"] != expected_units:
        result["issues"].append(
            f"{task}: expected {expected_units} scored trial units, observed {result['distinct_scored_units']}."
        )


def run_once(driver, run_id):
    driver.get(SURVEY_URL)
    time.sleep(2)

    result = {
        "run_id": run_id,
        "task": None,
        "intro_text": None,
        "seen_texts": [],
        "issues": [],
        "wording_flags": [],
    }

    stage = "pre_app"
    loops = 0

    while loops < 300:
        loops += 1
        text = safe_body_text(driver)
        if not text:
            time.sleep(0.5)
            continue
        record_seen_text(result["seen_texts"], text)

        if stage == "pre_app":
            if "Welcome. Before taking part in this study" in text:
                click_next_if_present(driver)
                time.sleep(1)
                continue
            if "In this task, you will estimate how wealth is distributed" in text:
                click_next_if_present(driver)
                time.sleep(1)
                continue
            if "Trillions of dollars of wealth per group" in text or "Wealth share (%) for one group" in text:
                fill_wealth_question(driver, text)
                click_next_if_present(driver)
                time.sleep(1)
                continue
            if fill_pre_app_inputs(driver, text):
                click_next_if_present(driver)
                time.sleep(1)
                continue
            if "Dot Estimation Task" in text or "Proportion Judgment Task" in text:
                result["intro_text"] = text
                result["task"] = classify_task_from_intro(text)
                if "gut" in text:
                    result["wording_flags"].append(f"{result['task']}: intro still uses 'gut'.")
                if "Preview configuration" in text:
                    result["wording_flags"].append(f"{result['task']}: intro still uses config-facing wording.")
                inject_capture_listener(driver)
                stage = "app"
                click_if_present(driver, ["Begin"])
                time.sleep(1)
                continue

        if stage == "app":
            capture = get_capture(driver)
            if capture:
                summarize_capture(result, capture)
                stage = "post_app"
                continue

            if "Let's do one quick practice round" in text:
                click_if_present(driver, ["Start Practice", "Start"])
                time.sleep(1)
                continue
            if "Nice, you're ready" in text:
                click_if_present(driver, ["Start", "Continue"])
                time.sleep(1)
                continue

            visible_inputs = [
                el
                for el in visible_elements(driver, "//input[not(@type) or @type='text' or @type='number' or @type='tel']")
                if el.is_enabled()
            ]
            if visible_inputs:
                fill_app_inputs(driver, result["task"] or "")
                if "gut" in text:
                    result["wording_flags"].append(f"{result['task']}: response prompt still uses 'gut'.")
                click_if_present(driver, ["Continue"])
                time.sleep(1)
                continue

            if click_if_present(driver, ["Begin", "Start Practice", "Start", "Continue"]):
                time.sleep(1)
                continue

            # timed fixation / stimulus / blank screens
            time.sleep(1.2)
            continue

        if stage == "post_app":
            if fill_generic_qualtrics_question(driver):
                time.sleep(0.3)
            if click_next_if_present(driver):
                time.sleep(1)
                continue
            if "Thank you" in text or "recorded" in text or "Powered by Qualtrics" not in text:
                break
            time.sleep(1)

    if result["task"] is None:
        result["issues"].append("Did not reach the embedded quantity task.")
    return result


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    driver = make_driver(headless=True)
    try:
        results = [run_once(driver, idx + 1) for idx in range(runs)]
    finally:
        driver.quit()
    payload = {"runs": results}
    text = json.dumps(payload, indent=2)
    print(text)
    if out_path:
        out_path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
