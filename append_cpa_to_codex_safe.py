import base64
import copy
import hashlib
import json
import shutil
import time
from pathlib import Path

CPA_FILE = Path(r"C:\Users\xiaoy\Downloads\LS20260508132435115921-cdk.txt")
DATA_DIR = Path.home() / ".antigravity_cockpit"
INDEX_FILE = DATA_DIR / "codex_accounts.json"
ACCOUNTS_DIR = DATA_DIR / "codex_accounts"


def decode_jwt_payload(token):
    try:
        payload = token.split(".")[1]
        payload += "=" * ((4 - len(payload) % 4) % 4)
        return json.loads(base64.urlsafe_b64decode(payload.encode("utf-8")))
    except Exception:
        return {}


def normalize(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def get_auth(payload):
    auth = payload.get("https://api.openai.com/auth")
    return auth if isinstance(auth, dict) else {}


def get_account_id(data, id_payload, access_payload):
    access_auth = get_auth(access_payload)
    id_auth = get_auth(id_payload)
    return normalize(
        access_auth.get("chatgpt_account_id")
        or access_auth.get("account_id")
        or id_auth.get("chatgpt_account_id")
        or id_auth.get("account_id")
        or data.get("account_id")
    )


def get_organization_id(id_payload, access_payload):
    for auth in (get_auth(access_payload), get_auth(id_payload)):
        for key in ("organization_id", "chatgpt_organization_id", "chatgpt_org_id", "org_id"):
            value = normalize(auth.get(key))
            if value:
                return value
        organizations = auth.get("organizations")
        if isinstance(organizations, list) and organizations:
            first = organizations[0]
            if isinstance(first, dict):
                value = normalize(first.get("id"))
                if value:
                    return value
    return None


def get_plan_type(id_payload, access_payload):
    return normalize(
        get_auth(access_payload).get("chatgpt_plan_type")
        or get_auth(id_payload).get("chatgpt_plan_type")
    )


def get_subscription_active_until(id_payload, access_payload):
    value = (
        get_auth(access_payload).get("chatgpt_subscription_active_until")
        or get_auth(id_payload).get("chatgpt_subscription_active_until")
    )
    return normalize(value)


def storage_id(email, account_id, organization_id):
    seed = email.strip()
    if normalize(account_id):
        seed += "|" + normalize(account_id)
    if normalize(organization_id):
        seed += "|" + normalize(organization_id)
    return "codex_" + hashlib.md5(seed.encode("utf-8")).hexdigest()


def unique_account_id(base_id, existing_ids):
    if base_id not in existing_ids and not (ACCOUNTS_DIR / f"{base_id}.json").exists():
        return base_id
    suffix = 1
    while True:
        candidate = f"{base_id}_cpa{suffix}"
        if candidate not in existing_ids and not (ACCOUNTS_DIR / f"{candidate}.json").exists():
            return candidate
        suffix += 1


def load_index():
    if INDEX_FILE.exists():
        with INDEX_FILE.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    return {"version": "1.0", "accounts": [], "current_account_id": None}


def summary_from_account(account):
    summary = {
        "id": account["id"],
        "email": account["email"],
        "plan_type": account.get("plan_type"),
        "created_at": account.get("created_at") or int(time.time()),
        "last_used": account.get("last_used") or int(time.time()),
    }
    if account.get("subscription_active_until") is not None:
        summary["subscription_active_until"] = account.get("subscription_active_until")
    return summary


def read_json_file(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main():
    if not CPA_FILE.exists():
        raise SystemExit(f"CPA 文件不存在: {CPA_FILE}")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ACCOUNTS_DIR.mkdir(parents=True, exist_ok=True)

    index = load_index()
    index.setdefault("version", "1.0")
    index.setdefault("accounts", [])
    original_current = index.get("current_account_id")

    timestamp = time.strftime("%Y%m%d%H%M%S")
    if INDEX_FILE.exists():
        backup = INDEX_FILE.with_name(f"codex_accounts.json.bak-{timestamp}")
        shutil.copy2(INDEX_FILE, backup)
        print(f"备份索引: {backup}")

    existing_ids = {normalize(item.get("id")) for item in index.get("accounts", []) if normalize(item.get("id"))}
    existing_keys = set()
    for item in index.get("accounts", []):
        account_id = normalize(item.get("id"))
        if not account_id:
            continue
        detail_path = ACCOUNTS_DIR / f"{account_id}.json"
        if detail_path.exists():
            try:
                account = read_json_file(detail_path)
                existing_keys.add((
                    normalize(account.get("email")) or normalize(item.get("email")),
                    normalize(account.get("account_id")),
                    normalize(account.get("organization_id")),
                ))
            except Exception:
                existing_keys.add((normalize(item.get("email")), None, None))
        else:
            existing_keys.add((normalize(item.get("email")), None, None))

    recovered = 0
    for detail_path in sorted(ACCOUNTS_DIR.glob("*.json")):
        try:
            account = read_json_file(detail_path)
        except Exception:
            continue
        account_id = normalize(account.get("id")) or detail_path.stem
        if account_id in existing_ids:
            continue
        account = copy.deepcopy(account)
        account["id"] = account_id
        index["accounts"].append(summary_from_account(account))
        existing_ids.add(account_id)
        existing_keys.add((normalize(account.get("email")), normalize(account.get("account_id")), normalize(account.get("organization_id"))))
        recovered += 1

    imported = 0
    skipped = 0
    for line_number, line in enumerate(CPA_FILE.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        entry = json.loads(line)
        data = entry.get("data") or {}
        id_token = normalize(data.get("id_token"))
        access_token = normalize(data.get("access_token"))
        refresh_token = normalize(data.get("refresh_token"))
        if not id_token or not access_token or not refresh_token:
            print(f"跳过第 {line_number} 行: 缺少 id_token/access_token/refresh_token")
            skipped += 1
            continue

        id_payload = decode_jwt_payload(id_token)
        access_payload = decode_jwt_payload(access_token)
        email = normalize(data.get("email")) or normalize(id_payload.get("email"))
        if not email:
            print(f"跳过第 {line_number} 行: 缺少 email")
            skipped += 1
            continue

        account_id = get_account_id(data, id_payload, access_payload)
        organization_id = get_organization_id(id_payload, access_payload)
        key = (email, account_id, organization_id)
        if key in existing_keys:
            print(f"跳过已存在账号: {email}")
            skipped += 1
            continue

        base_id = storage_id(email, account_id, organization_id)
        new_id = unique_account_id(base_id, existing_ids)
        now = int(time.time())
        plan_type = get_plan_type(id_payload, access_payload)
        account = {
            "id": new_id,
            "email": email,
            "auth_mode": "oauth",
            "api_provider_mode": "openai_builtin",
            "user_id": normalize(get_auth(access_payload).get("chatgpt_user_id") or get_auth(id_payload).get("chatgpt_user_id")),
            "plan_type": plan_type,
            "account_id": account_id,
            "organization_id": organization_id,
            "tokens": {
                "id_token": id_token,
                "access_token": access_token,
                "refresh_token": refresh_token,
            },
            "token_generation": 0,
            "token_updated_at": now,
            "token_source_mode": "managed",
            "requires_reauth": False,
            "quota": None,
            "quota_error": None,
            "usage_updated_at": None,
            "tags": None,
            "created_at": now,
            "last_used": now,
        }
        subscription_active_until = get_subscription_active_until(id_payload, access_payload)
        if subscription_active_until is not None:
            account["subscription_active_until"] = subscription_active_until

        detail_file = ACCOUNTS_DIR / f"{new_id}.json"
        if detail_file.exists():
            print(f"跳过第 {line_number} 行: 详情文件已存在 {detail_file.name}")
            skipped += 1
            continue

        with detail_file.open("x", encoding="utf-8") as handle:
            json.dump(account, handle, ensure_ascii=False, indent=2)
            handle.write("\n")

        index["accounts"].append(summary_from_account(account))
        existing_ids.add(new_id)
        existing_keys.add(key)
        imported += 1
        print(f"追加账号: {email} -> {new_id}")

    index["current_account_id"] = original_current
    with INDEX_FILE.open("w", encoding="utf-8") as handle:
        json.dump(index, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"完成: 恢复索引条目 {recovered} 个，追加 CPA 账号 {imported} 个，跳过 {skipped} 个。")
    print(f"当前索引账号数: {len(index.get('accounts', []))}")


if __name__ == "__main__":
    main()
