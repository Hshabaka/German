import hashlib, json, os, binascii
code = os.environ["SITE_PASSCODE"].strip().encode()
path = "data/gate.json"
salt = None
if os.path.exists(path):
    try:
        salt = json.load(open(path))["salt"]
    except Exception:
        salt = None
if not salt:
    salt = binascii.hexlify(os.urandom(16)).decode()
iters = 150000
h = hashlib.pbkdf2_hmac("sha256", code, bytes.fromhex(salt), iters)
out = {"alg": "PBKDF2-SHA256", "iter": iters, "salt": salt, "hash": binascii.hexlify(h).decode()}
os.makedirs("data", exist_ok=True)
json.dump(out, open(path, "w"))
print("gate ok")
