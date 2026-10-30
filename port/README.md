# Yosuga no Sora: Web

Port z Godota 4.6.1. Oryginalne pliki gry pozostają w katalogu nadrzędnym.

## Lokalnie

1. `python prepare.py` tworzy indeksy ZIP oraz paczki po 8 MiB w `release-assets/`.
2. Rozpakuj `templates/web_nothreads_release.zip` i `templates/web_nothreads_debug.zip` z oficjalnego pakietu szablonów Godota 4.6.1 do `tools/`.
3. Zaimportuj `project/` i wyeksportuj preset `Web` do `publish/game.html`.
4. Skopiuj `index.html`, `config.js` i `asset-bridge.js` do `publish/`.
5. `python serve.py`, następnie otwórz http://localhost:8765/publish/. W ustawieniach pobierania wpisz `http://localhost:8765/release-assets/`.

## GitHub Pages + Releases

Repozytorium: https://github.com/qbekun/Yosuga-no-Sora

* `publish/` zawiera stronę i eksport silnika. Tylko te pliki trafiają do Pages.
* Zawartość `release-assets/` prześlij do wydania `web-assets-v1` (poniżej 1000 załączników, wszystkie poniżej 2 GiB).
* `worker.js` jest pośrednikiem dla publicznych plików Releases. Nie przyjmuje dowolnego adresu docelowego. Skonfiguruj Cloudflare i uruchom `npx wrangler deploy` w tym katalogu.
* Skonfigurowany Worker: https://yosuga-assets.qbekun.workers.dev/ (`publish/config.js`).
* Pages: wdrożenie przez Actions z katalogu repozytorium zawierającego stronę.

## Ograniczenia pierwszej wersji

Pierwsze użycie niepobranej paczki może chwilowo zatrzymać grę: oryginalny silnik ładuje zasoby synchronicznie. Bufor JavaScript przechowuje maksymalnie sześć paczek (48 MiB), a nie całą grę. Godot ma dodatkowo własną pamięć tekstur i dźwięków. Dane są pobierane przez HTTPS; przeglądarka wymaga poprawnego CORS na serwerze danych. Zapisy są przechowywane w `user://` i zależą od zachowania danych witryny przez przeglądarkę. Czyszczenie danych witryny usuwa postęp.

Zmiany portu: `ZR.gd` odczytuje indeksy i pobiera skompresowany fragment ZIP przez JavaScriptBridge; `fs.gd` zapisuje do `user://save`; `global.gd` odtwarza opening przez element HTML video.

Na telefonie przycisk „Pełny ekran” uruchamia tryb natywny, jeśli przeglądarka go obsługuje. W pozostałych przypadkach gra wypełnia dostępne okno przeglądarki. Przycisk zamknięcia pozostaje widoczny. Ustawienia, zapisy i historia mają przycisk „Wróć”, który działa też w podmenu ustawień głosów. `version_web.py` nadaje zmienionej paczce silnika i skryptowi mostka nowe adresy, żeby przeglądarka pobierała zgodne wersje.
