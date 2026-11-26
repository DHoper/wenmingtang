"""測試用的假 Worker：攔下對 wenming-ai 的呼叫，回固定的批命／追問，不花 DeepSeek 也不吃線上次數。
用法：from fake_worker import fake_worker; fake_worker(ctx_or_page)"""
import json

READING = "【總評】林家豪這個名字，骨架硬，肯拚，就是家裡那一塊要多顧。【天格】姓「林」八畫加一，天格九畫，屬水，祖上給的，順帶看。【人格】「林」八畫加「家」十畫，人格十八畫，屬金，「鐵鏡重磨」，有魄力，做事撐得住。【地格】「家」十畫加「豪」十四畫，地格二十四畫，屬火，前半生靠自己打拚。【外格】「豪」十四畫加一，外格十五畫，屬土，出外有貴人。【總格】三個字加起來三十二畫，屬木，後半輩子順。【三才】水金火，金被火剋，家裡跟底下的人常給你出難題。【出外與晚運】外格土生人格金，朋友會幫你。【所問】自己當頭家撐得起來，本錢留厚一點。【改名】三才不順，認真想一下，取個常用名也有效。【總結】好在肯拚，怕在家裡。先把家裡顧好，再往外衝。"
ASK = "你問自己出來做生意，我照名字講。\n\n人格十八畫，「鐵鏡重磨」，自己當頭家撐得起來。\n\n本錢留厚一點，家裡先安頓好，再往外衝。"


def sse(t):
    return "".join("data: " + json.dumps({"choices": [{"delta": {"content": t[i:i + 6]}}]}, ensure_ascii=False) + "\n\n" for i in range(0, len(t), 6)) + "data: [DONE]\n\n"


def fake_worker(target, mode=None):
    """mode 是 dict {"v": "ok" | 錯誤代碼}，可在測試中途改值"""
    mode = mode if mode is not None else {"v": "ok"}
    def route(r):
        if r.request.method == "OPTIONS":
            return r.fulfill(status=204, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"})
        if r.request.url.endswith("/card"):
            try: mode["card"] = json.loads(r.request.post_data or "{}").get("target")
            except Exception: pass
            return r.fulfill(status=200, body=json.dumps({"id": "test123", "url": "https://wenming-ai.oracle-tarot.workers.dev/s/test123"}), headers={"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"})
        if mode["v"] != "ok":
            return r.fulfill(status=429, body=json.dumps({"error": mode["v"]}), headers={"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"})
        body = sse(READING if '"reading"' in (r.request.post_data or "") else ASK)
        r.fulfill(status=200, body=body, headers={"Content-Type": "text/event-stream", "Access-Control-Allow-Origin": "*"})
    target.route("https://wenming-ai.oracle-tarot.workers.dev/**", route)
    return mode
