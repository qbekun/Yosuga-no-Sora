# Yosuga no Sora — Web

[Uruchom grę](https://yns.lolikuza.ovh/)

Port gry do przeglądarki na silniku Godot 4.6.1, z obecną w projekcie polską wersją tekstu.

## Uruchomienie

Kliknij **Rozpocznij grę**. Enter lub kliknięcie przechodzi dalej, Q tworzy szybki zapis, D go wczytuje, S włącza pomijanie, a A tryb automatyczny. Dostępne są też przyciski w oknie gry.

Zapisy pozostają w tej przeglądarce po ponownym otwarciu strony. Czyszczenie danych witryny usuwa postęp. Przy pierwszym pobraniu nowych zasobów gra może się chwilowo zatrzymać.

## Hosting

* **GitHub Pages:** strona, WebAssembly i niewielka paczka silnika.
* **GitHub Releases, `web-assets-v1`:** dane gry podzielone na fragmenty po 8 MiB. `manifest.json` zawiera rozmiary i sumy SHA-256.
* **Cloudflare Worker:** https://yosuga-assets.qbekun.workers.dev/ — odczyt publicznych plików Releases z nagłówkami CORS dla Pages.

Silnik korzysta z indeksu plików ZIP i pobiera tylko potrzebne fragmenty. Bufor JavaScript mieści sześć fragmentów, czyli maksymalnie 48 MiB. Dodatkową pamięć wykorzystują silnik, rozpakowywane zasoby i tekstury.

## Kod i ponowny eksport

W `port/project/` znajduje się odzyskany i dostosowany projekt Godota. `port/README.md` opisuje przygotowanie danych i eksport. Oryginalne ZIP-y nie są przechowywane w historii Git.

Do ponownego zbudowania użyj oficjalnego Godota 4.6.1 i szablonów `web_nothreads_release.zip` / `web_nothreads_debug.zip`, umieszczonych w `port/tools/`. Uruchom `port/build.ps1`; wynik pojawi się w `port/publish/`. Przenieś pliki z tego katalogu do katalogu głównego repozytorium, zachowując `port/`, i zatwierdź zmianę.

Opening został przekonwertowany do MP4 dla zgodności z przeglądarkami. Port korzysta z eksportu bez wątków i renderera Compatibility.
