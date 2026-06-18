import json
import re

log_path = r"C:\Users\info\.gemini\antigravity\brain\1577f144-a8f1-437e-a57d-752724db685f\.system_generated\logs\transcript.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            # settingsTab === 'fee' を含む tool_calls や content を検索
            str_data = json.dumps(data, ensure_ascii=False)
            if "settingsTab === 'fee'" in str_data or "settingsTab === 'stripe'" in str_data:
                print(f"--- Step {data.get('step_index')} (Type: {data.get('type')}) ---")
                # tool_calls があればその引数を表示
                if 'tool_calls' in data:
                    for tc in data['tool_calls']:
                        if tc['name'] in ['replace_file_content', 'write_to_file', 'multi_replace_file_content']:
                            print(f"Tool Call: {tc['name']}")
                            args = tc.get('args', {})
                            # 文字列に変換して一部分だけ出す
                            args_str = json.dumps(args, ensure_ascii=False)
                            print(args_str[:1000] + "...")
                # content に含まれていれば一部分を表示
                content = data.get('content', '')
                if content:
                    print("Content preview:")
                    print(content[:500] + "...")
        except Exception as e:
            print("Error parsing line:", e)
