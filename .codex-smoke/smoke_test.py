from __future__ import annotations

import json
import sys
import urllib.parse

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


BASE = "http://localhost:8000/.codex-smoke/runner.html"

TASKS = [
    ("combined_session", {"task": "combined_session", "number_of_estimates": 12}),
    ("numerosity_only", {"task": "numerosity_only", "number_of_estimates": 12, "numerosity_range": "10-40"}),
    ("numerosity_separate_brief", {"task": "numerosity_separate_brief", "number_of_estimates": 12, "numerosity_range": "10-40", "brief_display_ms": 350}),
    ("numerosity_separate_visible", {"task": "numerosity_separate_visible", "number_of_estimates": 12, "numerosity_range": "10-40"}),
    ("numerosity_joint_brief_2", {"task": "numerosity_joint_brief", "number_of_estimates": 12, "number_of_arrays": 2, "numerosity_range": "10-60", "brief_display_ms": 350}),
    ("numerosity_joint_brief_4", {"task": "numerosity_joint_brief", "number_of_estimates": 12, "number_of_arrays": 4, "numerosity_range": "10-80", "brief_display_ms": 350}),
    ("numerosity_joint_brief_6", {"task": "numerosity_joint_brief", "number_of_estimates": 12, "number_of_arrays": 6, "numerosity_range": "10-120", "brief_display_ms": 350}),
    ("numerosity_joint_visible_2", {"task": "numerosity_joint_visible", "number_of_estimates": 12, "number_of_arrays": 2, "numerosity_range": "10-60"}),
    ("numerosity_joint_visible_4", {"task": "numerosity_joint_visible", "number_of_estimates": 12, "number_of_arrays": 4, "numerosity_range": "10-80"}),
    ("numerosity_joint_visible_6", {"task": "numerosity_joint_visible", "number_of_estimates": 12, "number_of_arrays": 6, "numerosity_range": "10-120"}),
    ("proportion_only", {"task": "proportion_only", "number_of_estimates": 12, "number_of_boxes": 5}),
    ("proportion_separate", {"task": "proportion_separate_evaluation", "number_of_estimates": 12}),
    ("proportion_joint_5", {"task": "proportion_joint_evaluation", "number_of_estimates": 12, "number_of_boxes": 5}),
    ("proportion_joint_8", {"task": "proportion_joint_evaluation", "number_of_estimates": 16, "number_of_boxes": 8}),
    ("proportion_joint_constsum_5", {"task": "proportion_joint_evaluation_constsum", "number_of_estimates": 12, "number_of_boxes": 5}),
    ("proportion_joint_constsum_8", {"task": "proportion_joint_evaluation_constsum", "number_of_estimates": 16, "number_of_boxes": 8}),
]


def build_url(params: dict[str, object]) -> str:
    merged = {"timeout_ms": 180000, **params}
    return BASE + "?" + urllib.parse.urlencode(merged)


def main() -> int:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1600,2600")
    options.add_argument("--disable-features=PaintHolding")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")

    driver = webdriver.Chrome(options=options)
    results: list[dict[str, object]] = []
    failures: list[dict[str, object]] = []

    try:
        selected = set(sys.argv[1:])
        task_list = [item for item in TASKS if not selected or item[0] in selected]
        for name, params in task_list:
            print(f"RUN {name}", flush=True)
            url = build_url(params)
            driver.get(url)
            WebDriverWait(driver, 45).until(
                EC.text_to_be_present_in_element((By.ID, "status"), "{")
            )
            raw = driver.find_element(By.ID, "status").text
            parsed = json.loads(raw)
            parsed["name"] = name
            parsed["params"] = params
            results.append(parsed)
            print(f"DONE {name} -> {parsed.get('status')}", flush=True)
            if parsed.get("status") != "pass":
                failures.append(parsed)

        print(json.dumps({"results": results, "failures": failures}, indent=2))
        return 1 if failures else 0
    finally:
        driver.quit()


if __name__ == "__main__":
    raise SystemExit(main())
