import csv
import io
import json
from typing import List


def export_csv(questions, responses) -> bytes:
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    headers = ["Response ID", "Submitted At", "IP"] + [q.label or f"Question {q.id}" for q in questions]
    writer.writerow(headers)

    for resp in responses:
        row = [resp.id, resp.submitted_at.isoformat(), resp.ip or ""]
        for q in questions:
            ans = next((a for a in resp.answers if a.question_id == q.id), None)
            if ans:
                if ans.value_json:
                    val = json.loads(ans.value_json)
                    row.append(json.dumps(val) if isinstance(val, (list, dict)) else str(val))
                else:
                    row.append(ans.value_text or "")
            else:
                row.append("")
        writer.writerow(row)

    # UTF-8 BOM for Excel compatibility
    return "\ufeff".encode("utf-8") + output.getvalue().encode("utf-8")
