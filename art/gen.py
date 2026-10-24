# Paint one picture with OpenRouter (Gemini image): model, output path, prompt, then any reference pictures for style.
import base64, json, sys, urllib.request
key = open('/home/rich/.config/agent/credentials/openrouter_api_key').read().strip()
model, out, prompt = sys.argv[1], sys.argv[2], sys.argv[3]
refs = sys.argv[4:]
content = [{"type": "text", "text": prompt}] + [{"type": "image_url", "image_url": {"url": "data:image/png;base64," + base64.b64encode(open(r, 'rb').read()).decode()}} for r in refs]
body = {"model": model, "modalities": ["image", "text"], "messages": [{"role": "user", "content": content}], "image_config": {"aspect_ratio": "16:9"}}
req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=json.dumps(body).encode(),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
r = json.load(urllib.request.urlopen(req, timeout=240))
msg = r["choices"][0]["message"]
imgs = msg.get("images") or []
if imgs:
    url = imgs[0]["image_url"]["url"]
    open(out, "wb").write(base64.b64decode(url.split(",", 1)[1])); print("saved", out, "cost", r.get("usage", {}).get("cost"))
else:
    print(json.dumps(r)[:600])
