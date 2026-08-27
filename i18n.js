(function createAICI18n(global) {
  "use strict";

  const STORAGE_KEY = "aic-2006-0010:interface-language";
  const SUPPORTED_LANGUAGES = Object.freeze({
    en: { label: "English", locale: "en-US", htmlLang: "en" },
    "zh-CN": { label: "简体中文", locale: "zh-CN", htmlLang: "zh-CN" },
    es: { label: "Español", locale: "es-ES", htmlLang: "es" },
    de: { label: "Deutsch", locale: "de-DE", htmlLang: "de" },
  });

  // Each entry is [English source, Simplified Chinese, Spanish, German].
  // English source strings double as stable lookup keys and fallback copy.
  const ENTRIES = [
    ["Language", "语言", "Idioma", "Sprache"],
    ["Interface language", "界面语言", "Idioma de la interfaz", "Oberflächensprache"],
    ["Skip to main content", "跳到主要内容", "Saltar al contenido principal", "Zum Hauptinhalt springen"],
    ["Alibaba.com Store Manager home", "阿里国际站店铺管理首页", "Inicio del gestor de tienda de Alibaba.com", "Startseite des Alibaba.com-Shopmanagers"],
    ["System status", "系统状态", "Estado del sistema", "Systemstatus"],
    ["Local MVP · No live publishing", "本地 MVP · 尚未连接线上发布", "MVP local · Sin publicación en vivo", "Lokales MVP · Keine Live-Veröffentlichung"],
    ["PRODUCT PUBLISHING COPILOT", "产品发布智能助手", "ASISTENTE DE PUBLICACIÓN", "ASSISTENT FÜR PRODUKTVERÖFFENTLICHUNG"],
    ["Turn product information into buyer-ready listings, published on schedule.", "将产品信息转化为适合买家查看的商品页，并按计划发布。", "Convierte la información del producto en publicaciones listas para compradores y prográmalas.", "Verwandeln Sie Produktdaten in für Einkäufer optimierte Angebote und veröffentlichen Sie sie planmäßig."],
    ["Organize product images, buyer benefits, OEM capabilities, and pricing in one place. Create B2B-ready detail pages and add them to a daily publishing schedule.", "集中管理产品图片、买家利益点、OEM 实力与定价；生成适合 B2B 采购的详情页，并加入每日发布计划。", "Organiza imágenes, ventajas para compradores, capacidades OEM y precios en un solo lugar. Crea páginas de detalles para B2B y añádelas al calendario diario.", "Verwalten Sie Produktbilder, Kundenvorteile, OEM-Kompetenzen und Preise zentral. Erstellen Sie B2B-Detailseiten und planen Sie deren tägliche Veröffentlichung."],
    ["Create Publishing Task", "创建发布任务", "Crear tarea de publicación", "Veröffentlichungsauftrag erstellen"],
    ["View Today’s Schedule", "查看今日计划", "Ver el calendario de hoy", "Heutigen Zeitplan anzeigen"],
    ["Assumption:", "假设：", "Supuesto:", "Annahme:"],
    ["This MVP simulates the full prepare–generate–schedule–export workflow. Live automated uploads will require an authorized Alibaba.com API integration.", "本 MVP 模拟“准备—生成—排期—导出”完整流程。自动上传到线上店铺需接入已授权的 Alibaba.com API。", "Este MVP simula el flujo completo de preparación, generación, programación y exportación. Las cargas automáticas requerirán una integración autorizada con la API de Alibaba.com.", "Dieses MVP simuliert den gesamten Ablauf von Vorbereitung, Erstellung, Planung und Export. Automatische Live-Uploads erfordern eine autorisierte Alibaba.com-API-Integration."],
    ["AUTO PUBLISH", "自动发布", "PUBLICACIÓN AUTOMÁTICA", "AUTOMATISCH VERÖFFENTLICHEN"],
    ["Schedule ready", "计划已就绪", "Calendario listo", "Zeitplan bereit"],
    ["Today’s Publishing Plan", "今日发布计划", "Plan de publicación de hoy", "Heutiger Veröffentlichungsplan"],
    ["Next run", "下次运行", "Próxima ejecución", "Nächster Lauf"],
    ["Today · 3 products", "今天 · 3 个产品", "Hoy · 3 productos", "Heute · 3 Produkte"],
    ["Validate images and product data", "检查图片和产品数据", "Validar imágenes y datos del producto", "Bilder und Produktdaten prüfen"],
    ["Generate selling points and detail page", "生成卖点和详情页", "Generar argumentos de venta y página de detalles", "Verkaufsargumente und Detailseite erstellen"],
    ["Add to publishing queue", "加入发布队列", "Añadir a la cola de publicación", "Zur Veröffentlichungswarteschlange hinzufügen"],
    ["Today’s task summary", "今日任务摘要", "Resumen de tareas de hoy", "Zusammenfassung der heutigen Aufgaben"],
    ["Incomplete", "未完成", "Incompletas", "Unvollständig"],
    ["Required details missing", "缺少必填信息", "Faltan datos obligatorios", "Pflichtangaben fehlen"],
    ["Scheduled Today", "今日已排期", "Programadas hoy", "Heute geplant"],
    ["Queued by rule", "已按规则排队", "En cola según la regla", "Regelbasiert eingeplant"],
    ["Published", "已发布", "Publicadas", "Veröffentlicht"],
    ["Total today", "今日总计", "Total de hoy", "Heute insgesamt"],
    ["Needs Attention", "需要处理", "Requiere atención", "Handlungsbedarf"],
    ["Needs attention", "需要处理", "Requiere atención", "Handlungsbedarf"],
    ["Edit and retry", "编辑后重试", "Editar y reintentar", "Bearbeiten und erneut versuchen"],
    ["NEW PUBLISHING TASK", "新建发布任务", "NUEVA TAREA DE PUBLICACIÓN", "NEUER VERÖFFENTLICHUNGSAUFTRAG"],
    ["Create a Publishing Task", "创建发布任务", "Crear una tarea de publicación", "Veröffentlichungsauftrag erstellen"],
    ["Complete the product details, generate the page, and confirm the publishing schedule.", "完善产品信息、生成详情页并确认发布计划。", "Completa los datos del producto, genera la página y confirma el calendario.", "Vervollständigen Sie die Produktdaten, erstellen Sie die Seite und bestätigen Sie den Zeitplan."],
    ["Task creation steps", "任务创建步骤", "Pasos para crear la tarea", "Schritte zur Aufgabenerstellung"],
    ["Product Details", "产品信息", "Datos del producto", "Produktdaten"],
    ["Page Content", "页面内容", "Contenido de la página", "Seiteninhalt"],
    ["Publishing Rules", "发布规则", "Reglas de publicación", "Veröffentlichungsregeln"],
    ["Product Images & Scenes", "产品图片与场景", "Imágenes y escenarios del producto", "Produktbilder und Szenen"],
    ["1 source image → 3 scene images", "1 张源图 → 3 张场景图", "1 imagen original → 3 imágenes de escenario", "1 Ausgangsbild → 3 Szenenbilder"],
    ["Upload one clear source image", "上传一张清晰的产品源图", "Sube una imagen original nítida", "Laden Sie ein klares Ausgangsbild hoch"],
    ["Transparent or solid background recommended · JPG, PNG, or WebP · Up to 10 MB", "建议使用透明或纯色背景 · JPG、PNG 或 WebP · 最大 10 MB", "Se recomienda fondo transparente o liso · JPG, PNG o WebP · Máx. 10 MB", "Transparenter oder einfarbiger Hintergrund empfohlen · JPG, PNG oder WebP · Max. 10 MB"],
    ["The source image preserves product appearance and structure", "源图用于保留产品外观和结构", "La imagen original conserva el aspecto y la estructura del producto", "Das Ausgangsbild bewahrt Aussehen und Struktur des Produkts"],
    ["SCENE & ANGLES", "场景与角度", "ESCENA Y ÁNGULOS", "SZENE UND PERSPEKTIVEN"],
    ["Match the product scene and generate three views", "匹配产品场景并生成三个视图", "Adapta el escenario y genera tres vistas", "Passende Szene wählen und drei Ansichten erstellen"],
    ["Create a front hero view, 45° feature view, and side structure view for the detail image.", "为详情长图生成正面主图、45° 卖点图和侧面结构图。", "Crea una vista principal frontal, una vista de características a 45° y una vista lateral para la imagen de detalles.", "Erstellen Sie eine frontale Hauptansicht, eine 45°-Detailansicht und eine seitliche Strukturansicht für das Detailbild."],
    ["Scene Background", "场景背景", "Fondo del escenario", "Szenenhintergrund"],
    ["Auto-match Product Category", "根据产品类目自动匹配", "Ajustar automáticamente a la categoría", "Automatisch an Produktkategorie anpassen"],
    ["Rehabilitation Clinic", "康复诊所", "Clínica de rehabilitación", "Rehabilitationsklinik"],
    ["Sports Training Studio", "运动训练室", "Estudio de entrenamiento deportivo", "Sporttrainingsstudio"],
    ["Outdoor Sports", "户外运动", "Deportes al aire libre", "Outdoor-Sport"],
    ["Clean Studio", "纯净摄影棚", "Estudio limpio", "Neutrales Studio"],
    ["Automatically selects a buyer-relevant setting for knee, back, and other support products.", "自动为护膝、护腰等支撑类产品选择适合买家的使用场景。", "Selecciona automáticamente un entorno relevante para compradores de soportes de rodilla, espalda y otros.", "Wählt automatisch eine einkäuferrelevante Umgebung für Knie-, Rücken- und andere Stützprodukte."],
    ["Three views to generate", "待生成的三个视图", "Tres vistas que se generarán", "Drei zu erstellende Ansichten"],
    ["Front Hero View", "正面主图", "Vista principal frontal", "Frontale Hauptansicht"],
    ["Show the complete product", "完整展示产品", "Mostrar el producto completo", "Gesamtes Produkt zeigen"],
    ["45° Feature View", "45° 卖点视图", "Vista de características a 45°", "45°-Detailansicht"],
    ["Highlight materials and construction", "突出材料与结构", "Destacar materiales y construcción", "Materialien und Verarbeitung hervorheben"],
    ["Side Structure View", "侧面结构视图", "Vista lateral de la estructura", "Seitliche Strukturansicht"],
    ["Show support components", "展示支撑部件", "Mostrar los componentes de soporte", "Stützkomponenten zeigen"],
    ["Current MVP:", "当前 MVP：", "MVP actual:", "Aktuelles MVP:"],
    ["Scene compositions are previewed locally. A server-side image model can later generate realistic new angles while preserving product consistency.", "场景合成在本地预览；后续可接入服务端图像模型，在保持产品一致性的同时生成真实的新角度。", "Las composiciones se previsualizan localmente. Más adelante, un modelo de imagen del servidor podrá crear nuevos ángulos realistas manteniendo la coherencia del producto.", "Szenenkompositionen werden lokal vorab angezeigt. Später kann ein serverseitiges Bildmodell realistische neue Perspektiven bei gleichbleibender Produktdarstellung erzeugen."],
    ["Basic Product Information", "产品基础信息", "Información básica del producto", "Grundlegende Produktdaten"],
    ["* Required", "* 必填", "* Obligatorio", "* Pflichtfeld"],
    ["Product Name (English)", "产品名称（英文）", "Nombre del producto (inglés)", "Produktname (Englisch)"],
    ["Describe the product and its use with keywords buyers search for.", "使用买家常搜的关键词描述产品及其用途。", "Describe el producto y su uso con palabras clave que buscan los compradores.", "Beschreiben Sie Produkt und Anwendung mit Suchbegriffen der Einkäufer."],
    ["Product Category", "产品类目", "Categoría del producto", "Produktkategorie"],
    ["Select a category", "选择类目", "Selecciona una categoría", "Kategorie auswählen"],
    ["Knee Support", "护膝", "Soporte de rodilla", "Kniebandage"],
    ["Back Support", "护腰", "Soporte lumbar", "Rückenstütze"],
    ["Ankle Support", "护踝", "Soporte de tobillo", "Sprunggelenkstütze"],
    ["Wrist Support", "护腕", "Soporte de muñeca", "Handgelenkstütze"],
    ["Custom Orthopedic Brace", "定制骨科支具", "Órtesis ortopédica personalizada", "Individuelle orthopädische Orthese"],
    ["Primary Buyer Market", "主要买家市场", "Mercado comprador principal", "Hauptabsatzmarkt"],
    ["North America & Europe", "北美与欧洲", "Norteamérica y Europa", "Nordamerika und Europa"],
    ["Southeast Asia", "东南亚", "Sudeste Asiático", "Südostasien"],
    ["Middle East", "中东", "Oriente Medio", "Naher Osten"],
    ["Global", "全球", "Global", "Global"],
    ["Search Keywords", "搜索关键词", "Palabras clave de búsqueda", "Suchbegriffe"],
    ["Separate keywords with commas. Up to five keywords.", "用逗号分隔，最多 5 个关键词。", "Separa las palabras con comas. Máximo cinco.", "Suchbegriffe mit Kommas trennen. Maximal fünf."],
    ["Buyer Benefits & OEM Capabilities", "买家利益点与 OEM 实力", "Ventajas para compradores y capacidad OEM", "Kundenvorteile und OEM-Kompetenz"],
    ["Key Selling Points", "核心卖点", "Argumentos de venta clave", "Wichtigste Verkaufsargumente"],
    ["Cover materials, function, use cases, and buyer value. Separate points with semicolons.", "涵盖材料、功能、使用场景和买家价值；用分号分隔。", "Incluye materiales, función, casos de uso y valor para el comprador. Separa los puntos con punto y coma.", "Materialien, Funktion, Einsatzbereiche und Einkäufernutzen abdecken. Punkte mit Semikolon trennen."],
    ["Customization Options", "定制选项", "Opciones de personalización", "Anpassungsoptionen"],
    ["Sample Lead Time (Days)", "样品交期（天）", "Plazo de entrega de muestras (días)", "Musterlieferzeit (Tage)"],
    ["Monthly Capacity (Units)", "月产能（件）", "Capacidad mensual (unidades)", "Monatskapazität (Stück)"],
    ["Certifications", "认证资质", "Certificaciones", "Zertifizierungen"],
    ["Pricing & Publishing Rules", "定价与发布规则", "Precios y reglas de publicación", "Preise und Veröffentlichungsregeln"],
    ["MOQ (Units)", "起订量（件）", "MOQ (unidades)", "Mindestbestellmenge (Stück)"],
    ["Minimum Price (USD)", "最低价格（USD）", "Precio mínimo (USD)", "Mindestpreis (USD)"],
    ["Maximum Price (USD)", "最高价格（USD）", "Precio máximo (USD)", "Höchstpreis (USD)"],
    ["Lead Time (Days)", "交期（天）", "Plazo de entrega (días)", "Lieferzeit (Tage)"],
    ["Quick Price Adjustment", "快速调价", "Ajuste rápido de precios", "Schnelle Preisanpassung"],
    ["Enter a percentage to preview the adjusted price.", "输入百分比以预览调价结果。", "Introduce un porcentaje para previsualizar el precio ajustado.", "Prozentsatz eingeben, um den angepassten Preis anzuzeigen."],
    ["Adjustment", "调整比例", "Ajuste", "Anpassung"],
    ["Apply Price", "应用价格", "Aplicar precio", "Preis anwenden"],
    ["Enable Daily Auto-Publishing", "启用每日自动发布", "Activar la publicación automática diaria", "Tägliche automatische Veröffentlichung aktivieren"],
    ["Publish 3 products daily at 09:30, starting tomorrow", "从明天开始，每天 09:30 发布 3 个产品", "Publicar 3 productos al día a las 09:30 a partir de mañana", "Ab morgen täglich um 09:30 Uhr 3 Produkte veröffentlichen"],
    ["Daily Quantity", "每日数量", "Cantidad diaria", "Tagesmenge"],
    ["Run Time", "运行时间", "Hora de ejecución", "Ausführungszeit"],
    ["Start Date", "开始日期", "Fecha de inicio", "Startdatum"],
    ["Demo & Testing Settings", "演示与测试设置", "Configuración de demostración y pruebas", "Demo- und Testeinstellungen"],
    ["Simulate a generation failure to test error and retry feedback", "模拟生成失败，以测试错误和重试反馈", "Simular un fallo de generación para probar los mensajes de error y reintento", "Erstellungsfehler simulieren, um Fehler- und Wiederholungsmeldungen zu testen"],
    ["Save Draft", "保存草稿", "Guardar borrador", "Entwurf speichern"],
    ["Generate 3 Scene Images & Detail Image", "生成 3 张场景图和详情长图", "Generar 3 imágenes de escenario y la imagen de detalles", "3 Szenenbilder und Detailbild erstellen"],
    ["Detail Image Preview", "详情长图预览", "Vista previa de la imagen de detalles", "Vorschau des Detailbilds"],
    ["Auto-Matched Scene", "自动匹配场景", "Escenario ajustado automáticamente", "Automatisch gewählte Szene"],
    ["Preparing a sample detail image", "正在准备示例详情长图", "Preparando una imagen de detalles de muestra", "Beispiel-Detailbild wird vorbereitet"],
    ["Your generated page will appear as one downloadable long-form PNG", "生成的详情页将以一张可下载的长 PNG 图片呈现", "La página generada aparecerá como una imagen PNG larga descargable", "Die erstellte Seite erscheint als langes, herunterladbares PNG"],
    ["3 GENERATED VIEWS", "3 个已生成视图", "3 VISTAS GENERADAS", "3 ERSTELLTE ANSICHTEN"],
    ["Three Scene Views", "三个场景视图", "Tres vistas de escenario", "Drei Szenenansichten"],
    ["Sample", "示例", "Muestra", "Beispiel"],
    ["The detail image includes the product name, pricing, MOQ, three product views, buyer benefits, lead time, and OEM customization capabilities.", "详情长图包含产品名称、价格、起订量、三个产品视图、买家利益点、交期和 OEM 定制能力。", "La imagen de detalles incluye el nombre, precio, MOQ, tres vistas, ventajas, plazo de entrega y capacidad de personalización OEM.", "Das Detailbild enthält Produktname, Preis, Mindestbestellmenge, drei Ansichten, Kundenvorteile, Lieferzeit und OEM-Anpassungsmöglichkeiten."],
    ["Copy Detail Copy", "复制详情文案", "Copiar texto de detalles", "Detailtext kopieren"],
    ["Download Detail PNG", "下载详情长图 PNG", "Descargar PNG de detalles", "Detail-PNG herunterladen"],
    ["PUBLISHING QUEUE", "发布队列", "COLA DE PUBLICACIÓN", "VERÖFFENTLICHUNGSWARTESCHLANGE"],
    ["Today’s Publishing Schedule", "今日发布计划", "Calendario de publicación de hoy", "Heutiger Veröffentlichungszeitplan"],
    ["Review each product’s data completeness, pricing, and publishing status.", "检查每个产品的数据完整度、价格和发布状态。", "Revisa la integridad de los datos, los precios y el estado de publicación de cada producto.", "Prüfen Sie Datenvollständigkeit, Preise und Veröffentlichungsstatus jedes Produkts."],
    ["Filter publishing tasks", "筛选发布任务", "Filtrar tareas de publicación", "Veröffentlichungsaufgaben filtern"],
    ["All", "全部", "Todas", "Alle"],
    ["Scheduled", "已排期", "Programadas", "Geplant"],
    ["Drafts", "草稿", "Borradores", "Entwürfe"],
    ["Product", "产品", "Producto", "Produkt"],
    ["Scheduled Time", "计划时间", "Hora programada", "Geplante Zeit"],
    ["Scheduled time", "计划时间", "Hora programada", "Geplante Zeit"],
    ["Price", "价格", "Precio", "Preis"],
    ["Data Completeness", "数据完整度", "Integridad de datos", "Datenvollständigkeit"],
    ["Data completeness", "数据完整度", "Integridad de datos", "Datenvollständigkeit"],
    ["Content completeness", "内容完整度", "Integridad del contenido", "Inhaltsvollständigkeit"],
    ["Status", "状态", "Estado", "Status"],
    ["Actions", "操作", "Acciones", "Aktionen"],
    ["Knee Support · OEM / ODM", "护膝 · OEM / ODM", "Soporte de rodilla · OEM / ODM", "Kniebandage · OEM / ODM"],
    ["Back Support · Medical Rehabilitation", "护腰 · 医疗康复", "Soporte lumbar · Rehabilitación médica", "Rückenstütze · Medizinische Rehabilitation"],
    ["Wrist Support · Sports Protection", "护腕 · 运动防护", "Soporte de muñeca · Protección deportiva", "Handgelenkstütze · Sportschutz"],
    ["Today, 09:30", "今天，09:30", "Hoy, 09:30", "Heute, 09:30"],
    ["Today, 08:45", "今天，08:45", "Hoy, 08:45", "Heute, 08:45"],
    ["Today, 08:30", "今天，08:30", "Hoy, 08:30", "Heute, 08:30"],
    ["Price Check Required", "需要检查价格", "Se requiere revisar el precio", "Preisprüfung erforderlich"],
    ["Awaiting review", "等待审核", "Pendiente de revisión", "Prüfung ausstehend"],
    ["Fix", "修复", "Corregir", "Korrigieren"],
    ["View", "查看", "Ver", "Anzeigen"],
    ["No tasks match this filter", "没有符合此筛选条件的任务", "Ninguna tarea coincide con este filtro", "Keine Aufgaben entsprechen diesem Filter"],
    ["Choose another status or create a new publishing task.", "请选择其他状态，或创建新的发布任务。", "Elige otro estado o crea una nueva tarea de publicación.", "Wählen Sie einen anderen Status oder erstellen Sie eine neue Veröffentlichungsaufgabe."],
    ["Alibaba.com Store Manager · Product Admin Workspace", "阿里国际站店铺管理 · 产品管理工作台", "Gestor de tienda de Alibaba.com · Área de administración de productos", "Alibaba.com-Shopmanager · Produktverwaltung"],
    ["Data is stored only in this browser. This MVP does not modify your live store.", "数据仅保存在当前浏览器中。本 MVP 不会修改您的线上店铺。", "Los datos solo se guardan en este navegador. Este MVP no modifica tu tienda activa.", "Daten werden nur in diesem Browser gespeichert. Dieses MVP ändert Ihren Live-Shop nicht."],

    // Dynamic UI, validation and feedback.
    ["Interface language changed to {{language}}.", "界面语言已切换为{{language}}。", "El idioma de la interfaz ha cambiado a {{language}}.", "Die Oberflächensprache wurde auf {{language}} umgestellt."],
    ["Local storage is unavailable, but your content will remain on this page for now.", "本地存储不可用，但您的内容会暂时保留在此页面。", "El almacenamiento local no está disponible, pero el contenido permanecerá en esta página por ahora.", "Der lokale Speicher ist nicht verfügbar; Ihre Inhalte bleiben vorerst auf dieser Seite."],
    ["Generating scene images and detail page…", "正在生成场景图和详情页……", "Generando imágenes de escenario y página de detalles…", "Szenenbilder und Detailseite werden erstellt…"],
    ["Regenerate 3 scene images and detail page", "重新生成 3 张场景图和详情页", "Volver a generar 3 imágenes de escenario y la página de detalles", "3 Szenenbilder und Detailseite neu erstellen"],
    ["Generate 3 scene images and detail page", "生成 3 张场景图和详情页", "Generar 3 imágenes de escenario y la página de detalles", "3 Szenenbilder und Detailseite erstellen"],
    ["Smart scene match", "智能场景匹配", "Ajuste inteligente de escenario", "Intelligente Szenenanpassung"],
    ["Rehabilitation clinic", "康复诊所", "Clínica de rehabilitación", "Rehabilitationsklinik"],
    ["Sports training studio", "运动训练室", "Estudio de entrenamiento deportivo", "Sporttrainingsstudio"],
    ["Outdoor sports setting", "户外运动场景", "Entorno de deportes al aire libre", "Outdoor-Sportszene"],
    ["Clean studio", "纯净摄影棚", "Estudio limpio", "Neutrales Studio"],
    ["Front view", "正面视图", "Vista frontal", "Frontansicht"],
    ["45° feature view", "45° 卖点视图", "Vista de características a 45°", "45°-Detailansicht"],
    ["Side profile", "侧面轮廓", "Perfil lateral", "Seitenprofil"],
    ["No date set", "未设置日期", "Sin fecha", "Kein Datum festgelegt"],
    ["Starting {{date}}, publish {{count}} products daily at {{time}}", "从 {{date}} 开始，每天 {{time}} 发布 {{count}} 个产品", "A partir del {{date}}, publicar {{count}} productos al día a las {{time}}", "Ab {{date}} täglich {{count}} Produkte um {{time}} Uhr veröffentlichen"],
    ["Auto-publishing is off. Generated tasks will be saved for review.", "自动发布已关闭。生成的任务将保存以供审核。", "La publicación automática está desactivada. Las tareas generadas se guardarán para revisión.", "Die automatische Veröffentlichung ist deaktiviert. Erstellte Aufgaben werden zur Prüfung gespeichert."],
    ["Enter a valid percentage from -50% to 100%.", "请输入 -50% 到 100% 之间的有效百分比。", "Introduce un porcentaje válido entre -50 % y 100 %.", "Geben Sie einen gültigen Prozentsatz zwischen -50 % und 100 % ein."],
    ["Preview: US${{min}}–{{max}} ({{percent}}%)", "预览：US${{min}}–{{max}}（{{percent}}%）", "Vista previa: US${{min}}–{{max}} ({{percent}} %)", "Vorschau: US${{min}}–{{max}} ({{percent}} %)"],
    ["Source image", "源图", "Imagen original", "Ausgangsbild"],
    ["Remove image {{name}}", "移除图片 {{name}}", "Eliminar imagen {{name}}", "Bild {{name}} entfernen"],
    ["This image has not been generated yet.", "此图片尚未生成。", "Esta imagen aún no se ha generado.", "Dieses Bild wurde noch nicht erstellt."],
    ["Demo", "演示", "Demostración", "Demo"],
    ["Generated 3/3", "已生成 3/3", "Generadas 3/3", "3/3 erstellt"],
    ["Not generated", "尚未生成", "No generadas", "Nicht erstellt"],
    ["Download {{label}} image", "下载{{label}}图片", "Descargar imagen de {{label}}", "Bild „{{label}}“ herunterladen"],
    ["Download {{label}}", "下载{{label}}", "Descargar {{label}}", "{{label}} herunterladen"],
    ["Awaiting detail image", "等待生成详情长图", "Esperando la imagen de detalles", "Detailbild ausstehend"],
    ["Submit to generate a downloadable PNG detail image", "提交后生成可下载的 PNG 详情长图", "Envía el formulario para generar una imagen PNG de detalles descargable", "Senden Sie das Formular, um ein herunterladbares PNG-Detailbild zu erstellen"],
    ["Only 1 source image is needed. Additional images not added: {{count}}", "只需要 1 张源图。未添加的多余图片：{{count}} 张", "Solo se necesita 1 imagen original. Imágenes adicionales no añadidas: {{count}}", "Es wird nur 1 Ausgangsbild benötigt. Nicht hinzugefügte weitere Bilder: {{count}}"],
    ["{{name}}: JPG, PNG, or WebP only", "{{name}}：仅支持 JPG、PNG 或 WebP", "{{name}}: solo JPG, PNG o WebP", "{{name}}: nur JPG, PNG oder WebP"],
    ["{{name}}: exceeds 10 MB", "{{name}}：超过 10 MB", "{{name}}: supera los 10 MB", "{{name}}: überschreitet 10 MB"],
    ["{{name}}: matches the current source image", "{{name}}：与当前源图相同", "{{name}}: coincide con la imagen original actual", "{{name}}: entspricht dem aktuellen Ausgangsbild"],
    ["{{name}}: unreadable or damaged image", "{{name}}：图片无法读取或已损坏", "{{name}}: imagen ilegible o dañada", "{{name}}: Bild ist unlesbar oder beschädigt"],
    ["The source image has changed. Regenerate the three views and detail image.", "源图已更改，请重新生成三个视图和详情长图。", "La imagen original ha cambiado. Vuelve a generar las tres vistas y la imagen de detalles.", "Das Ausgangsbild wurde geändert. Erstellen Sie die drei Ansichten und das Detailbild neu."],
    ["Source image replaced. Regenerate the images.", "源图已替换，请重新生成图片。", "Imagen original reemplazada. Vuelve a generar las imágenes.", "Ausgangsbild ersetzt. Erstellen Sie die Bilder neu."],
    ["Source image added. You can now generate three views.", "源图已添加，现在可以生成三个视图。", "Imagen original añadida. Ya puedes generar tres vistas.", "Ausgangsbild hinzugefügt. Sie können jetzt drei Ansichten erstellen."],
    ["{{count}} image issue(s) found. Check the upload area for details.", "发现 {{count}} 个图片问题，请查看上传区域。", "Se encontraron {{count}} problemas con las imágenes. Revisa el área de carga.", "{{count}} Bildproblem(e) gefunden. Details finden Sie im Upload-Bereich."],
    ["Upload at least 1 product image.", "请至少上传 1 张产品图片。", "Sube al menos 1 imagen del producto.", "Laden Sie mindestens 1 Produktbild hoch."],
    ["Enter an English product name.", "请输入英文产品名称。", "Introduce un nombre de producto en inglés.", "Geben Sie einen englischen Produktnamen ein."],
    ["Product name must be at least 8 characters.", "产品名称至少需要 8 个字符。", "El nombre del producto debe tener al menos 8 caracteres.", "Der Produktname muss mindestens 8 Zeichen lang sein."],
    ["Product name must be no more than 120 characters.", "产品名称不能超过 120 个字符。", "El nombre del producto no puede superar los 120 caracteres.", "Der Produktname darf höchstens 120 Zeichen lang sein."],
    ["Select a product category.", "请选择产品类目。", "Selecciona una categoría de producto.", "Wählen Sie eine Produktkategorie aus."],
    ["Enter at least 1 English search keyword.", "请至少输入 1 个英文搜索关键词。", "Introduce al menos 1 palabra clave de búsqueda en inglés.", "Geben Sie mindestens 1 englischen Suchbegriff ein."],
    ["Enter no more than 5 keywords.", "最多输入 5 个关键词。", "Introduce un máximo de 5 palabras clave.", "Geben Sie höchstens 5 Suchbegriffe ein."],
    ["Enter at least 2 verifiable selling points.", "请至少输入 2 个可验证的卖点。", "Introduce al menos 2 argumentos de venta verificables.", "Geben Sie mindestens 2 überprüfbare Verkaufsargumente ein."],
    ["Separate at least 2 selling points with semicolons.", "请用分号分隔至少 2 个卖点。", "Separa al menos 2 argumentos de venta con punto y coma.", "Trennen Sie mindestens 2 Verkaufsargumente durch Semikolons."],
    ["Sample lead time must be an integer from 1 to 60 days.", "样品交期必须是 1 到 60 天之间的整数。", "El plazo de muestras debe ser un entero entre 1 y 60 días.", "Die Musterlieferzeit muss eine ganze Zahl zwischen 1 und 60 Tagen sein."],
    ["Monthly capacity must be an integer from 1 to 9,999,999.", "月产能必须是 1 到 9,999,999 之间的整数。", "La capacidad mensual debe ser un entero entre 1 y 9.999.999.", "Die Monatskapazität muss eine ganze Zahl zwischen 1 und 9.999.999 sein."],
    ["MOQ must be an integer from 1 to 999,999.", "起订量必须是 1 到 999,999 之间的整数。", "El MOQ debe ser un entero entre 1 y 999.999.", "Die Mindestbestellmenge muss eine ganze Zahl zwischen 1 und 999.999 sein."],
    ["Lead time must be an integer from 1 to 365 days.", "交期必须是 1 到 365 天之间的整数。", "El plazo de entrega debe ser un entero entre 1 y 365 días.", "Die Lieferzeit muss eine ganze Zahl zwischen 1 und 365 Tagen sein."],
    ["Minimum price must be between 0.01 and 999,999.99.", "最低价格必须在 0.01 到 999,999.99 之间。", "El precio mínimo debe estar entre 0,01 y 999.999,99.", "Der Mindestpreis muss zwischen 0,01 und 999.999,99 liegen."],
    ["Maximum price must be between 0.01 and 999,999.99.", "最高价格必须在 0.01 到 999,999.99 之间。", "El precio máximo debe estar entre 0,01 y 999.999,99.", "Der Höchstpreis muss zwischen 0,01 und 999.999,99 liegen."],
    ["Prices can have no more than 2 decimal places.", "价格最多保留 2 位小数。", "Los precios pueden tener como máximo 2 decimales.", "Preise dürfen höchstens 2 Dezimalstellen haben."],
    ["Maximum price cannot be lower than minimum price.", "最高价格不能低于最低价格。", "El precio máximo no puede ser inferior al mínimo.", "Der Höchstpreis darf nicht unter dem Mindestpreis liegen."],
    ["Daily publishing limit must be an integer from 1 to 20.", "每日发布数量必须是 1 到 20 之间的整数。", "El límite diario debe ser un entero entre 1 y 20.", "Das tägliche Veröffentlichungslimit muss eine ganze Zahl zwischen 1 und 20 sein."],
    ["Choose a daily publishing time.", "请选择每日发布时间。", "Elige una hora de publicación diaria.", "Wählen Sie eine tägliche Veröffentlichungszeit."],
    ["Choose an auto-publishing start date.", "请选择自动发布的开始日期。", "Elige una fecha de inicio para la publicación automática.", "Wählen Sie ein Startdatum für die automatische Veröffentlichung."],
    ["Start date cannot be earlier than today.", "开始日期不能早于今天。", "La fecha de inicio no puede ser anterior a hoy.", "Das Startdatum darf nicht vor dem heutigen Datum liegen."],
    ["Required fields to complete: {{count}}.", "需要完成的必填项：{{count}} 个。", "Campos obligatorios pendientes: {{count}}.", "Noch auszufüllende Pflichtfelder: {{count}}."],
    ["Auto-publishing is off; awaiting manual review", "自动发布已关闭；等待人工审核", "La publicación automática está desactivada; pendiente de revisión manual", "Automatische Veröffentlichung ist deaktiviert; manuelle Prüfung ausstehend"],
    ["Category: {{value}}", "类目：{{value}}", "Categoría: {{value}}", "Kategorie: {{value}}"],
    ["Price: US${{min}}–{{max}}", "价格：US${{min}}–{{max}}", "Precio: US${{min}}–{{max}}", "Preis: US${{min}}–{{max}}"],
    ["MOQ: {{value}} pieces", "起订量：{{value}} 件", "MOQ: {{value}} unidades", "Mindestbestellmenge: {{value}} Stück"],
    ["Lead time: {{value}} days", "交期：{{value}} 天", "Plazo de entrega: {{value}} días", "Lieferzeit: {{value}} Tage"],
    ["Product images: 3 views · {{scene}}", "产品图片：3 个视图 · {{scene}}", "Imágenes del producto: 3 vistas · {{scene}}", "Produktbilder: 3 Ansichten · {{scene}}"],
    ["KEY BUYING POINTS", "核心采购卖点", "PUNTOS CLAVE DE COMPRA", "WICHTIGSTE KAUFARGUMENTE"],
    ["Customization: {{value}}", "定制：{{value}}", "Personalización: {{value}}", "Anpassung: {{value}}"],
    ["Sample lead time: {{value}} days", "样品交期：{{value}} 天", "Plazo de muestras: {{value}} días", "Musterlieferzeit: {{value}} Tage"],
    ["Monthly capacity: {{value}} pieces", "月产能：{{value}} 件", "Capacidad mensual: {{value}} unidades", "Monatskapazität: {{value}} Stück"],
    ["Quality certifications: {{value}}", "质量认证：{{value}}", "Certificaciones de calidad: {{value}}", "Qualitätszertifizierungen: {{value}}"],
    ["Main market: {{value}}", "主要市场：{{value}}", "Mercado principal: {{value}}", "Hauptmarkt: {{value}}"],
    ["Publishing plan: {{value}}", "发布计划：{{value}}", "Plan de publicación: {{value}}", "Veröffentlichungsplan: {{value}}"],
    ["Draft saved. You will need to select the local image again after refreshing.", "草稿已保存。刷新后需要重新选择本地图片。", "Borrador guardado. Tendrás que seleccionar de nuevo la imagen local después de actualizar.", "Entwurf gespeichert. Nach dem Neuladen müssen Sie das lokale Bild erneut auswählen."],
    ["Draft saved in this browser.", "草稿已保存在此浏览器中。", "Borrador guardado en este navegador.", "Entwurf in diesem Browser gespeichert."],
    ["Awaiting manual review", "等待人工审核", "Pendiente de revisión manual", "Manuelle Prüfung ausstehend"],
    ["Generating detail image", "正在生成详情长图", "Generando imagen de detalles", "Detailbild wird erstellt"],
    ["Creating three scene images, then arranging pricing, selling points, and OEM capabilities", "正在创建三张场景图，然后编排价格、卖点与 OEM 实力", "Creando tres imágenes de escenario y organizando precios, argumentos de venta y capacidades OEM", "Drei Szenenbilder werden erstellt; anschließend werden Preise, Verkaufsargumente und OEM-Kompetenzen angeordnet"],
    ["Generating image 1 of 3: Front view…", "正在生成第 1/3 张图片：正面视图……", "Generando imagen 1 de 3: vista frontal…", "Bild 1 von 3 wird erstellt: Frontansicht…"],
    ["Generating three scene images and the detail image. Please wait.", "正在生成三张场景图和详情长图，请稍候。", "Generando tres imágenes de escenario y la imagen de detalles. Espera un momento.", "Drei Szenenbilder und das Detailbild werden erstellt. Bitte warten."],
    ["All three scene images are ready. Building the detail image…", "三张场景图已完成，正在生成详情长图……", "Las tres imágenes de escenario están listas. Generando la imagen de detalles…", "Alle drei Szenenbilder sind fertig. Das Detailbild wird erstellt…"],
    ["Three scene images and the detail image are ready. Publishing is scheduled for {{date}} at {{time}}.", "三张场景图和详情长图已完成，计划于 {{date}} {{time}} 发布。", "Las tres imágenes de escenario y la imagen de detalles están listas. La publicación está programada para el {{date}} a las {{time}}.", "Die drei Szenenbilder und das Detailbild sind fertig. Die Veröffentlichung ist für {{date}} um {{time}} Uhr geplant."],
    ["Three scene images and the detail image are ready and saved for manual review.", "三张场景图和详情长图已完成，并已保存等待人工审核。", "Las tres imágenes de escenario y la imagen de detalles están listas y guardadas para revisión manual.", "Die drei Szenenbilder und das Detailbild sind fertig und zur manuellen Prüfung gespeichert."],
    ["Image generation failed. Your content was preserved and you can retry.", "图片生成失败。内容已保留，您可以重试。", "La generación de imágenes falló. El contenido se ha conservado y puedes reintentarlo.", "Die Bilderstellung ist fehlgeschlagen. Ihre Inhalte wurden beibehalten; Sie können es erneut versuchen."],
    ["Generate the latest detail image before copying the description.", "复制描述前，请先生成最新详情长图。", "Genera la imagen de detalles más reciente antes de copiar la descripción.", "Erstellen Sie vor dem Kopieren der Beschreibung das aktuelle Detailbild."],
    ["Product description copied. It is ready to paste into your publishing dashboard.", "产品描述已复制，可粘贴到发布后台。", "Descripción del producto copiada y lista para pegar en el panel de publicación.", "Produktbeschreibung kopiert und bereit zum Einfügen in das Veröffentlichungs-Dashboard."],
    ["Product description copied.", "产品描述已复制。", "Descripción del producto copiada.", "Produktbeschreibung kopiert."],
    ["Copy failed. Select and copy the description manually from the preview.", "复制失败，请从预览中手动选择并复制描述。", "Error al copiar. Selecciona y copia manualmente la descripción desde la vista previa.", "Kopieren fehlgeschlagen. Wählen und kopieren Sie die Beschreibung manuell aus der Vorschau."],
    ["Generate the latest detail image before downloading the PNG.", "下载 PNG 前，请先生成最新详情长图。", "Genera la imagen de detalles más reciente antes de descargar el PNG.", "Erstellen Sie vor dem Herunterladen des PNG das aktuelle Detailbild."],
    ["Detail-page PNG downloaded. It is ready for your Alibaba.com product page.", "详情页 PNG 已下载，可用于 Alibaba.com 产品页。", "PNG de la página de detalles descargado y listo para tu página de producto de Alibaba.com.", "Detailseiten-PNG heruntergeladen und bereit für Ihre Alibaba.com-Produktseite."],
    ["Export failed. Allow downloads in your browser and try again.", "导出失败，请允许浏览器下载后重试。", "La exportación falló. Permite las descargas en el navegador y vuelve a intentarlo.", "Export fehlgeschlagen. Erlauben Sie Downloads im Browser und versuchen Sie es erneut."],
    ["Enter a non-zero adjustment from -50% to 100%.", "请输入 -50% 到 100% 之间且不为 0 的调整比例。", "Introduce un ajuste distinto de cero entre -50 % y 100 %.", "Geben Sie eine Anpassung ungleich null zwischen -50 % und 100 % ein."],
    ["Enter a valid current price range first.", "请先输入有效的当前价格区间。", "Introduce primero un intervalo de precios actual válido.", "Geben Sie zuerst eine gültige aktuelle Preisspanne ein."],
    ["Adjusted from US${{oldMin}}–{{oldMax}} to US${{newMin}}–{{newMax}}.", "已从 US${{oldMin}}–{{oldMax}} 调整为 US${{newMin}}–{{newMax}}。", "Ajustado de US${{oldMin}}–{{oldMax}} a US${{newMin}}–{{newMax}}.", "Von US${{oldMin}}–{{oldMax}} auf US${{newMin}}–{{newMax}} angepasst."],
    ["Price {{direction}} by {{percent}}%. You can still edit it before generating.", "价格已{{direction}} {{percent}}%。生成前仍可编辑。", "El precio ha {{direction}} un {{percent}} %. Aún puedes editarlo antes de generar.", "Der Preis wurde um {{percent}} % {{direction}}. Sie können ihn vor der Erstellung noch bearbeiten."],
    ["increased", "上调", "aumentado", "erhöht"],
    ["decreased", "下调", "reducido", "gesenkt"],
    ["Price updated successfully.", "价格已成功更新。", "Precio actualizado correctamente.", "Preis erfolgreich aktualisiert."],
    ["Price updated. Regenerate the three views and detail image.", "价格已更新，请重新生成三个视图和详情长图。", "Precio actualizado. Vuelve a generar las tres vistas y la imagen de detalles.", "Preis aktualisiert. Erstellen Sie die drei Ansichten und das Detailbild neu."],
    ["Product content changed. Regenerate the three views and detail image.", "产品内容已更改，请重新生成三个视图和详情长图。", "El contenido del producto ha cambiado. Vuelve a generar las tres vistas y la imagen de detalles.", "Produktinhalt geändert. Erstellen Sie die drei Ansichten und das Detailbild neu."],
    ["Source image removed. Upload an image before generating again.", "源图已移除，请先上传图片再重新生成。", "Imagen original eliminada. Sube una imagen antes de volver a generar.", "Ausgangsbild entfernt. Laden Sie vor der erneuten Erstellung ein Bild hoch."],
    ["{{name}} was removed from the image list.", "{{name}} 已从图片列表中移除。", "{{name}} se eliminó de la lista de imágenes.", "{{name}} wurde aus der Bilderliste entfernt."],
    ["This view needs to be regenerated.", "此视图需要重新生成。", "Esta vista debe volver a generarse.", "Diese Ansicht muss neu erstellt werden."],
    ["{{label}} downloaded.", "{{label}}已下载。", "{{label}} descargada.", "{{label}} heruntergeladen."],
    ["Product loaded. Review the pricing, then regenerate.", "产品已载入，请检查价格后重新生成。", "Producto cargado. Revisa los precios y vuelve a generar.", "Produkt geladen. Prüfen Sie die Preise und erstellen Sie es anschließend neu."],
    ["Product requiring attention loaded.", "需要处理的产品已载入。", "Producto que requiere atención cargado.", "Produkt mit Handlungsbedarf geladen."],
    ["The detail preview for {{name}} is in the Create Task section.", "{{name}} 的详情预览位于“创建任务”区域。", "La vista previa de {{name}} está en la sección Crear tarea.", "Die Detailvorschau für {{name}} befindet sich im Bereich „Aufgabe erstellen“."],
    ["Your saved product draft was restored.", "已恢复保存的产品草稿。", "Se restauró el borrador de producto guardado.", "Ihr gespeicherter Produktentwurf wurde wiederhergestellt."],
    ["Your previous content was restored. Images are not stored in the browser; select the source image again and regenerate.", "之前的内容已恢复。浏览器不会保存图片，请重新选择源图并生成。", "Se restauró el contenido anterior. Las imágenes no se guardan en el navegador; vuelve a seleccionar la imagen original y genera de nuevo.", "Ihre vorherigen Inhalte wurden wiederhergestellt. Bilder werden nicht im Browser gespeichert; wählen Sie das Ausgangsbild erneut und erstellen Sie neu."],
    ["Alibaba.com Store Manager for product images, selling points, OEM capabilities, pricing, and publishing schedules.", "用于管理产品图片、卖点、OEM 实力、定价和发布计划的阿里国际站店铺管理工具。", "Gestor de tienda de Alibaba.com para imágenes, argumentos de venta, capacidades OEM, precios y calendarios de publicación.", "Alibaba.com-Shopmanager für Produktbilder, Verkaufsargumente, OEM-Kompetenzen, Preise und Veröffentlichungspläne."],
    ["Add key selling points.", "请添加核心卖点。", "Añade argumentos de venta clave.", "Fügen Sie wichtige Verkaufsargumente hinzu."],
    ["{{name}}, source product image awaiting three-view scene generation", "{{name}}，等待生成三个场景视图的产品源图", "{{name}}, imagen original pendiente de generar tres vistas", "{{name}}, Ausgangsbild zur Erstellung von drei Szenenansichten"],
    ["{{product}}, {{view}}, {{scene}}", "{{product}}，{{view}}，{{scene}}", "{{product}}, {{view}}, {{scene}}", "{{product}}, {{view}}, {{scene}}"],
    ["Demo knee brace detail image with three views, pricing, selling points, and OEM capabilities", "护膝演示详情长图，包含三个视图、价格、卖点和 OEM 实力", "Imagen de detalles de demostración con tres vistas, precios, argumentos de venta y capacidades OEM", "Demo-Detailbild einer Kniebandage mit drei Ansichten, Preisen, Verkaufsargumenten und OEM-Kompetenzen"],
    ["{{product}} detail image with three views, pricing, selling points, and OEM capabilities", "{{product}}详情长图，包含三个视图、价格、卖点和 OEM 实力", "Imagen de detalles de {{product}} con tres vistas, precios, argumentos de venta y capacidades OEM", "Detailbild für {{product}} mit drei Ansichten, Preisen, Verkaufsargumenten und OEM-Kompetenzen"],
    ["{{date}} at {{time}}, {{count}} products per day", "{{date}} {{time}}，每天 {{count}} 个产品", "{{date}} a las {{time}}, {{count}} productos al día", "{{date}} um {{time}} Uhr, {{count}} Produkte pro Tag"],
    ["OEM / ODM CAPABILITY", "OEM / ODM 实力", "CAPACIDAD OEM / ODM", "OEM-/ODM-KOMPETENZ"],
    ["Logo, color, size and packaging", "Logo、颜色、尺码和包装", "Logotipo, color, talla y embalaje", "Logo, Farbe, Größe und Verpackung"],
    ["Available on request", "可按需提供", "Disponible bajo solicitud", "Auf Anfrage verfügbar"],
    ["This draft references {{count}} image(s) ({{names}}). For browser security, please select the file again.", "此草稿引用了 {{count}} 张图片（{{names}}）。出于浏览器安全限制，请重新选择文件。", "Este borrador hace referencia a {{count}} imagen(es) ({{names}}). Por seguridad del navegador, vuelve a seleccionar el archivo.", "Dieser Entwurf verweist auf {{count}} Bild(er) ({{names}}). Wählen Sie die Datei aus Sicherheitsgründen erneut aus."],
    ["Image generation failed: the demo service is temporarily unavailable. Your content was preserved; select the main button to retry.", "图片生成失败：演示服务暂时不可用。内容已保留，请点击主按钮重试。", "Error al generar las imágenes: el servicio de demostración no está disponible temporalmente. El contenido se ha conservado; usa el botón principal para reintentarlo.", "Bilderstellung fehlgeschlagen: Der Demo-Dienst ist vorübergehend nicht verfügbar. Ihre Inhalte wurden beibehalten; verwenden Sie die Hauptschaltfläche zum erneuten Versuch."],
    ["Image generation failed. Your content was preserved; use the main button to retry.", "图片生成失败。内容已保留，请使用主按钮重试。", "La generación de imágenes falló. El contenido se ha conservado; usa el botón principal para reintentarlo.", "Die Bilderstellung ist fehlgeschlagen. Ihre Inhalte wurden beibehalten; verwenden Sie die Hauptschaltfläche zum erneuten Versuch."],
    ["Unknown error", "未知错误", "Error desconocido", "Unbekannter Fehler"],
    ["Image generation failed: {{detail}}. Your content was preserved; please retry.", "图片生成失败：{{detail}}。内容已保留，请重试。", "Error al generar las imágenes: {{detail}}. El contenido se ha conservado; inténtalo de nuevo.", "Bilderstellung fehlgeschlagen: {{detail}}. Ihre Inhalte wurden beibehalten; bitte versuchen Sie es erneut."],
    ["Image generation failed. Your source content and completed views were preserved.", "图片生成失败，源内容和已完成的视图均已保留。", "La generación de imágenes falló. Se conservaron el contenido original y las vistas completadas.", "Die Bilderstellung ist fehlgeschlagen. Ausgangsinhalte und fertige Ansichten wurden beibehalten."],
    ["Image generation failed. You can retry.", "图片生成失败，您可以重试。", "La generación de imágenes falló. Puedes reintentarlo.", "Die Bilderstellung ist fehlgeschlagen. Sie können es erneut versuchen."],
    ["Product description could not be copied.", "无法复制产品描述。", "No se pudo copiar la descripción del producto.", "Die Produktbeschreibung konnte nicht kopiert werden."],
    ["Detail-page PNG downloaded.", "详情页 PNG 已下载。", "PNG de la página de detalles descargado.", "Detailseiten-PNG heruntergeladen."],
    ["Detail image download failed.", "详情长图下载失败。", "Error al descargar la imagen de detalles.", "Download des Detailbilds fehlgeschlagen."],
    ["Demo detail image unavailable", "演示详情长图不可用", "Imagen de detalles de demostración no disponible", "Demo-Detailbild nicht verfügbar"],
    ["You can still complete the product details after uploading a source image", "上传源图后仍可继续完善产品信息", "Puedes completar los datos del producto después de subir una imagen original", "Nach dem Hochladen eines Ausgangsbilds können Sie die Produktdaten weiter ausfüllen"],
    ["Upload a source image, then select Generate to try again", "请上传源图，然后选择“生成”重试", "Sube una imagen original y selecciona Generar para volver a intentarlo", "Laden Sie ein Ausgangsbild hoch und wählen Sie anschließend „Erstellen“, um es erneut zu versuchen"],
    ["This product", "此产品", "Este producto", "Dieses Produkt"],
    ["Interface language changed. Regenerate the three views and detail image.", "界面语言已更改，请重新生成三个视图和详情长图。", "El idioma de la interfaz ha cambiado. Vuelve a generar las tres vistas y la imagen de detalles.", "Die Oberflächensprache wurde geändert. Erstellen Sie die drei Ansichten und das Detailbild neu."],
    ["Content changed · Regenerate", "内容已更改 · 请重新生成", "Contenido modificado · Volver a generar", "Inhalt geändert · Neu erstellen"],
    ["Front View", "正面视图", "Vista frontal", "Frontansicht"],
    ["PROFILE", "侧面", "PERFIL", "PROFIL"],
    ["VIEW {{index}} / 03", "视图 {{index}} / 03", "VISTA {{index}} / 03", "ANSICHT {{index}} / 03"],
    ["B2B SCENE COMPOSITION", "B2B 场景合成", "COMPOSICIÓN B2B", "B2B-SZENENKOMPOSITION"],
    ["OEM / ODM PRODUCT", "OEM / ODM 产品", "PRODUCTO OEM / ODM", "OEM-/ODM-PRODUKT"],
    ["OEM PRODUCT STUDIO", "OEM 产品工作室", "ESTUDIO DE PRODUCTOS OEM", "OEM-PRODUKTSTUDIO"],
    ["PRODUCT IMAGE", "产品图片", "IMAGEN DEL PRODUCTO", "PRODUKTBILD"],
    ["Designed for {{market}} procurement", "面向{{market}}采购", "Diseñado para compras en {{market}}", "Für die Beschaffung in {{market}}"],
    ["REFERENCE PRICE", "参考价格", "PRECIO DE REFERENCIA", "RICHTPREIS"],
    ["{{count}} pcs", "{{count}} 件", "{{count}} uds.", "{{count}} Stk."],
    ["{{count}} days", "{{count}} 天", "{{count}} días", "{{count}} Tage"],
    ["{{count}} days lead time", "交期 {{count}} 天", "Entrega en {{count}} días", "{{count}} Tage Lieferzeit"],
    ["PRODUCT VIEWS", "产品视图", "VISTAS DEL PRODUCTO", "PRODUKTANSICHTEN"],
    ["Three Buyer-Ready Product Views", "面向买家的三个产品视图", "Tres vistas listas para compradores", "Drei Ansichten für Einkäufer"],
    ["WHY BUYERS CHOOSE IT", "买家为何选择它", "POR QUÉ LO ELIGEN", "DARUM WÄHLEN EINKÄUFER"],
    ["Key Benefits for B2B Buyers", "B2B 买家的核心利益点", "Ventajas clave para compradores B2B", "Wichtigste Vorteile für B2B-Einkäufer"],
    ["From Sampling to Volume Delivery", "从打样到批量交付", "De la muestra a la producción", "Vom Muster bis zur Serie"],
    ["SAMPLE LEAD TIME", "样品交期", "PLAZO DE MUESTRA", "MUSTERLIEFERZEIT"],
    ["MONTHLY CAPACITY", "月产能", "CAPACIDAD MENSUAL", "MONATSKAPAZITÄT"],
    ["TARGET MARKET", "目标市场", "MERCADO OBJETIVO", "ZIELMARKT"],
    ["CUSTOMIZATION OPTIONS", "定制选项", "PERSONALIZACIÓN", "ANPASSUNGSOPTIONEN"],
    ["Requirements Review", "需求确认", "Revisión de requisitos", "Anforderungsprüfung"],
    ["Sample Development", "样品开发", "Desarrollo de muestra", "Musterentwicklung"],
    ["Quality Inspection", "质量检验", "Control de calidad", "Qualitätsprüfung"],
    ["Volume Delivery", "批量交付", "Entrega a escala", "Serienlieferung"],
    ["QUALITY ASSURANCE", "质量保障", "GARANTÍA DE CALIDAD", "QUALITÄTSSICHERUNG"],
    ["Certifications & Quality Documentation", "认证与质量文件", "Certificaciones y documentación", "Zertifikate und Qualitätsnachweise"],
    ["READY FOR YOUR OEM PROJECT", "为您的 OEM 项目做好准备", "LISTO PARA TU PROYECTO OEM", "BEREIT FÜR IHR OEM-PROJEKT"],
    ["Final prices, lead times, and certificates are subject to order confirmation.", "最终价格、交期和认证文件以订单确认为准。", "Los precios, plazos y certificados finales están sujetos a la confirmación del pedido.", "Endpreise, Lieferzeiten und Zertifikate gelten vorbehaltlich der Auftragsbestätigung."],
    ["OEM READY", "OEM 就绪", "LISTO PARA OEM", "OEM-BEREIT"],
    ["Orthopedic Support", "骨科支撑产品", "Soporte ortopédico", "Orthopädische Stütze"],
    ["OEM Orthopedic Support Product", "OEM 骨科支撑产品", "Producto ortopédico OEM", "Orthopädisches OEM-Stützprodukt"],
    ["Global B2B Market", "全球 B2B 市场", "Mercado B2B global", "Globaler B2B-Markt"],
    ["Logo, color, size, and packaging customization", "支持 Logo、颜色、尺码和包装定制", "Personalización de logotipo, color, talla y embalaje", "Anpassung von Logo, Farbe, Größe und Verpackung"],
    ["Quality documents available on request", "可按需提供质量文件", "Documentación de calidad disponible bajo solicitud", "Qualitätsnachweise auf Anfrage verfügbar"],
    ["Stable support engineered to balance mobility with all-day comfort", "稳定支撑，兼顾活动灵活性与全天舒适度", "Soporte estable que equilibra movilidad y comodidad durante todo el día", "Stabile Unterstützung für Bewegungsfreiheit und ganztägigen Komfort"],
    ["Materials, sizing, and packaging optimized for volume procurement", "材料、尺码和包装均针对批量采购优化", "Materiales, tallas y embalaje optimizados para compras a gran escala", "Materialien, Größen und Verpackung für Großbestellungen optimiert"],
    ["Custom branding, colors, sizes, and packaging available", "支持品牌、颜色、尺码和包装定制", "Marca, colores, tallas y embalaje personalizados disponibles", "Individuelle Marke, Farben, Größen und Verpackungen verfügbar"],
    ["Sports Rehabilitation Setting", "运动康复场景", "Entorno de rehabilitación deportiva", "Sportrehabilitationsumgebung"],
    ["Professional Rehabilitation Setting", "专业康复场景", "Entorno profesional de rehabilitación", "Professionelle Rehabilitationsumgebung"],
    ["Workplace Support Setting", "办公支撑场景", "Entorno de apoyo en el trabajo", "Arbeitsplatzumgebung"],
    ["Outdoor Sports Setting", "户外运动场景", "Entorno deportivo al aire libre", "Outdoor-Sportumgebung"],
    ["Manufacturing Capability Setting", "制造实力场景", "Entorno de capacidad de fabricación", "Produktionsumgebung"],
    ["Everyday Use Setting", "日常使用场景", "Entorno de uso diario", "Alltagssituation"],
    ["Clean Studio Setting", "纯净摄影棚场景", "Estudio limpio", "Neutrales Studio"],
  ];

  const TRANSLATIONS = { "zh-CN": new Map(), es: new Map(), de: new Map() };
  ENTRIES.forEach(([source, chinese, spanish, german]) => {
    TRANSLATIONS["zh-CN"].set(source, chinese);
    TRANSLATIONS.es.set(source, spanish);
    TRANSLATIONS.de.set(source, german);
  });

  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  const translatableAttributes = ["aria-label", "placeholder", "title", "data-label", "alt"];
  let currentLanguage = detectInitialLanguage();

  function detectInitialLanguage() {
    try {
      const saved = global.localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_LANGUAGES[saved]) return saved;
    } catch {
      // Language selection still works for this page when storage is unavailable.
    }
    const browserLanguage = String(global.navigator?.language || "en").toLowerCase();
    if (browserLanguage.startsWith("zh")) return "zh-CN";
    if (browserLanguage.startsWith("es")) return "es";
    if (browserLanguage.startsWith("de")) return "de";
    return "en";
  }

  function interpolate(value, variables = {}) {
    return String(value).replace(/\{\{(\w+)\}\}/g, (match, name) => (
      Object.hasOwn(variables, name) ? String(variables[name]) : match
    ));
  }

  function t(source, variables = {}) {
    const translated = currentLanguage === "en"
      ? source
      : TRANSLATIONS[currentLanguage]?.get(source) || source;
    return interpolate(translated, variables);
  }

  function translateTextNode(node) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue || "");
    const sourceValue = originalText.get(node);
    const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(sourceValue);
    if (!match || !match[2]) return;
    const translated = t(match[2]);
    node.nodeValue = `${match[1]}${translated}${match[3]}`;
  }

  function translateElementAttributes(element) {
    if (!originalAttributes.has(element)) originalAttributes.set(element, new Map());
    const stored = originalAttributes.get(element);
    translatableAttributes.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      if (!stored.has(attribute)) stored.set(attribute, element.getAttribute(attribute));
      element.setAttribute(attribute, t(stored.get(attribute)));
    });
  }

  function applyTranslations(root = document) {
    document.documentElement.lang = SUPPORTED_LANGUAGES[currentLanguage].htmlLang;
    const selector = document.getElementById("language-selector");
    if (selector) selector.value = currentLanguage;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    let node = walker.nextNode();
    while (node) {
      translateTextNode(node);
      node = walker.nextNode();
    }

    if (root instanceof Element) translateElementAttributes(root);
    root.querySelectorAll?.("[aria-label], [placeholder], [title], [data-label], [alt]").forEach(translateElementAttributes);

    document.title = `${t("Alibaba.com Store Manager")} | AIC-2006-0010`;
    const description = t("Alibaba.com Store Manager for product images, selling points, OEM capabilities, pricing, and publishing schedules.");
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", t("Turn product information into buyer-ready listings, published on schedule."));
    document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", t("Turn product information into buyer-ready listings, published on schedule."));
    document.querySelector('meta[property="og:locale"]')?.setAttribute("content", SUPPORTED_LANGUAGES[currentLanguage].locale.replace("-", "_"));
  }

  function setLanguage(language, { announce = true } = {}) {
    if (!SUPPORTED_LANGUAGES[language] || language === currentLanguage) return false;
    currentLanguage = language;
    try {
      global.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Persistence is optional; the active language still changes.
    }
    applyTranslations();
    global.dispatchEvent(new CustomEvent("aic:languagechange", {
      detail: { language, locale: getLocale(), label: SUPPORTED_LANGUAGES[language].label, announce },
    }));
    return true;
  }

  function getLanguage() {
    return currentLanguage;
  }

  function getLocale() {
    return SUPPORTED_LANGUAGES[currentLanguage].locale;
  }

  function formatNumber(value, options = {}) {
    return new Intl.NumberFormat(getLocale(), options).format(value);
  }

  const languageSelector = document.getElementById("language-selector");
  languageSelector?.addEventListener("change", (event) => {
    setLanguage(event.target.value);
  });

  global.AICI18n = Object.freeze({
    applyTranslations,
    formatNumber,
    getLanguage,
    getLocale,
    languages: SUPPORTED_LANGUAGES,
    setLanguage,
    t,
  });

  applyTranslations();
})(window);
