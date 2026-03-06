# UE5.7 Fantasy Roam Demo Kit (macOS)

Цей набір створює фентезі-демо на базі безкоштовного контенту Unreal:
- вбудований `Third Person` template;
- рівень типу `Open World`;
- автоматичний world seed скриптом (`Python` у UE Editor);
- пакування в `.app` + `.dmg` для macOS.

## Важливо

У цьому середовищі Unreal Engine не встановлений, тому я підготував повністю автоматизований kit, який ти запускаєш на своєму Mac з установленим UE.

## Актуальна версія UE

Станом на **5 березня 2026** орієнтир для цього kit: **Unreal Engine 5.7**  
Офіційне джерело: [Unreal Engine Releases](https://www.unrealengine.com/en-US/release-notes)

## Безкоштовні джерела/шаблони

- Built-in `Third Person` template (встановлюється разом з UE).
- `Open World` рівень у редакторі (новий рівень через шаблон Open World).
- Опційно можна додати безкоштовні Fab семпли:
  - [Stack O Bot](https://www.fab.com/listings/b4dfff49-0e7d-4c4b-a6c5-8a0315831c9c)
  - [Parrot Game Sample](https://www.fab.com/listings/918456eb-4c36-4346-9be2-8986e25c9a0b)

## Швидкий старт (10-15 хв)

1. Встанови Unreal Engine 5.7 (Epic Games Launcher).
2. Створи новий проєкт:
   - `Games -> Third Person`.
   - `Blueprint`.
   - `Desktop`.
   - увімкни `Starter Content`.
   - назва, наприклад: `FantasyRoam`.
3. У проєкті створи мапу:
   - `File -> New Level -> Open World`.
   - збережи як `/Game/Maps/L_FantasyRoam`.
4. Увімкни плагін:
   - `Python Editor Script Plugin` (Edit -> Plugins).
   - перезапусти UE.
5. Запусти seed скрипт:

```bash
cd /Users/dmitrije/Documents/New\ project/ue57-fantasy-demo
./scripts/run_seed.sh "/Users/Shared/Epic Games/UE_5.7" "/ABS/PATH/TO/FantasyRoam.uproject" "/Game/Maps/L_FantasyRoam"
```

Після цього на мапі згенеруються:
- великі руїни/вежі-маяки;
- кристальні зони з освітленням;
- багато декоративних скельних кластерів;
- великі ворота по краях світу.

Цього достатньо для ~30 хв вільного бігу/дослідження.

## Збірка macOS DMG

```bash
cd /Users/dmitrije/Documents/New\ project/ue57-fantasy-demo
./scripts/package_mac_dmg.sh "/Users/Shared/Epic Games/UE_5.7" "/ABS/PATH/TO/FantasyRoam.uproject" "/ABS/PATH/TO/output"
```

Результат:
- `<output>/archive/.../FantasyRoam.app`
- `<output>/FantasyRoam-macOS.dmg`

## Перший запуск на macOS

Якщо застосунок без Developer ID notarization:
- `Right Click` на `.app` -> `Open`.

## Файли kit

- `tools/seed_fantasy_world.py` — генерація фентезі-світу.
- `scripts/run_seed.sh` — запуск seed скрипта через UnrealEditor-Cmd.
- `scripts/package_mac_dmg.sh` — BuildCookRun + формування DMG.
