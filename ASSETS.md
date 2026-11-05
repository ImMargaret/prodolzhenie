# Материалы и зависимости

Визуальный референс: https://continuance.ai/ — изучены интерфейс загрузки, метаданные, структура и публичные CSS. Палитра: #343849, #ad8aff, #e4e5e8, #f4f4f4, #c8c8ca, #0c0c0c. Исходный JavaScript сайта, его модели, персонажи, музыка и тексты не включены в этот проект.

Герои — самостоятельные художественные интерпретации Воланда, Маргариты и Бегемота. Диалоги написаны специально для проекта. Актёры экранизаций не использовались как референсы внешности.

Изображения созданы встроенным ImageGen. `reliquary.webp` — футуристическая графитовая скульптура головы внутри серебряных орбит с фиолетовым световым швом, светло-серый фон. `woland.webp`, `margarita.webp`, `behemoth.webp` — три согласованных чёрно-белых CGI-портрета на графитовом фоне с фиолетовым контровым светом. Технические кропы для игры сохранены как `*-memory.webp`. Персонажи и объект включены в комплект; внешние хостинги изображений не используются.

Финальные запросы к генератору:

- Hero: “A single ultra realistic CGI neural reliquary on light gray #e4e5e8. Two brushed silver orbital rings surrounding a glossy charcoal androgynous sculptural head, eyes closed, violet seam, black glass memory cartridge. Machined black titanium and chrome, lavender #ad8aff reflections, soft studio lighting. Entire object visible, wide 3:2 composition with negative space. No text, UI or watermark.”
- Cast: “Exactly three equal vertical portrait panels: Woland, severe angular sophisticated man in a black suit; Margarita, intense pale woman with swept dark hair and black 1930s evening neckline; Behemoth, a large jet-black cat with bowtie. Original novel interpretations, not actors. Matte graphite background, photoreal CGI, silver smoke, lavender rim light, subtle archival scanner grain. Matching portrait scale. No writing or watermark.”

Шрифты загружены через Google Fonts:

- Manrope: https://fonts.google.com/specimen/Manrope — кириллица, заголовки. Лицензия SIL Open Font License.
- Roboto Mono: https://fonts.google.com/specimen/Roboto+Mono — кириллица, технические подписи. Лицензия SIL Open Font License.

Локальная библиотека Three.js r158 (0.158.0), лицензия MIT: `assets/vendor/THREE-LICENSE.txt`. Документация: https://threejs.org/docs/ . Версия зафиксирована и не загружается из CDN при просмотре.

3D-геометрия создана процедурно в `assets/scene.js`. Материалы, студийная среда и частицы создаются кодом. HDRI и чужие 3D-модели не используются.

Фоновое звучание и короткие сигналы синтезируются Web Audio API: авторская комбинация низких осцилляторов, отфильтрованного шума и интерфейсных нот. Записей чужой музыки, голосов актёров или политиков нет.
