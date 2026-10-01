# Run the legacy Quart app

The original SimplyTranslate Web app remains in this repository while the Cloudflare Worker is being developed. Its routes and provider engines are described in the [legacy API reference](../api.md). This app is separate from the Worker documented in [deployment](deployment.md).

From the repository root, install its Python dependencies and start it:

```sh
python3 -m pip install -r requirements.txt
python3 main.py
```

The upstream README also documents `uvicorn main:app --port 5000` as a way to start it. These legacy start commands have not been revalidated during the Worker migration.

The app reads `config.conf` in the repository, `/etc/simplytranslate/shared.conf`, and `/etc/simplytranslate/web.conf`. Pass `-c` or `--config` to `main.py` to use a specific configuration file. See the defaults and comments in [config.conf](../config.conf).

For upstream instance listings, support, and contribution instructions, visit [SimplyTranslate Web](https://codeberg.org/SimpleWeb/SimplyTranslate-Web).
