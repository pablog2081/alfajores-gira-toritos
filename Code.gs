/**
 * Alfajores Gira Toritos — backend en Google Apps Script.
 *
 * QUÉ HACE:
 * - Recibe pedidos de alfajores y comprobantes de pago desde las páginas web
 *   (sin pasar por Google Forms), escribiéndolos directo en esta planilla.
 * - Atiende al panel de administración: login con clave, listar pedidos,
 *   marcar entregado, generar el reporte en Excel.
 * - Le da a "Caja de la Gira" un resumen (acción "resumen") para que pueda
 *   actualizar sus propios números con un botón.
 *
 * CÓMO INSTALARLO (una sola vez):
 * 1. Abrí la planilla "Panel Admin – Pedidos Alfajores Gira Toritos":
 *    https://docs.google.com/spreadsheets/d/1H0Pjs5UKF8sessxeOD8_lADLAVKKODnhc-xk7Z6QDs8/edit
 * 2. Menú Extensiones → Apps Script.
 * 3. Borrá todo el contenido que aparece por defecto y pegá este archivo completo.
 * 4. La clave de administrador ya viene configurada como "toritos2026" (ver
 *    ADMIN_PASSWORD abajo). Si preferís otra, cambiala ahí antes de implementar.
 * 5. Arriba a la derecha, botón Implementar → Nueva implementación.
 *    - Tipo: Aplicación web.
 *    - Ejecutar como: Yo (tu cuenta).
 *    - Quién tiene acceso: Cualquier usuario.
 * 6. Autorizá los permisos que pida (es tu propio script, es normal que pida acceso
 *    a tus planillas y a Drive).
 * 7. Copiá la URL que te da ("URL de la aplicación web") y pasámela — con eso
 *    conecto las páginas.
 *
 * Si más adelante cambiás el código, tenés que crear una "Nueva implementación"
 * de nuevo (o editar la implementación existente) para que el cambio se vea reflejado.
 */

// ================= CONFIGURACIÓN =================

// Clave de administrador. CAMBIALA antes de publicar el sistema.
var ADMIN_PASSWORD = 'toritos2026';

// Planilla donde vive todo (Panel Admin – Pedidos Alfajores Gira Toritos).
var SHEET_ID = '1H0Pjs5UKF8sessxeOD8_lADLAVKKODnhc-xk7Z6QDs8';

// Planilla con la lista de nombres de viajeros (para el desplegable del pedido).
var VIAJEROS_SHEET_ID = '1bK0rEMyvhQehkvd9dpB4XX1G_z210WLisfpKHaQdqgk';

// Carpeta de Drive donde se guardan los comprobantes subidos.
var DRIVE_FOLDER_NAME = 'Comprobantes Alfajores Gira Toritos';

var PEDIDOS_SHEET = 'Pedidos';
var COMPROBANTES_SHEET = 'Comprobantes';

var PEDIDOS_HEADERS = ['Fecha y hora', 'Nombre y Apellido', 'Docenas', 'Entregado', 'Fecha de entrega', 'Rendido', 'Fecha de rendición', 'Comprobante pendiente de validar', 'Link comprobante', 'Notas'];
var COMPROBANTES_HEADERS = ['Fecha y hora', 'Nombre y Apellido', 'Archivo', 'Aclaración'];

// ================= RUTAS =================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  try {
    if (action === 'resumen') return jsonOut_(getResumen_());
    if (action === 'viajeros') return jsonOut_({ ok: true, viajeros: getViajeros_() });

    if (action === 'pedidos') {
      if (!checkAdmin_(e.parameter.clave)) return jsonOut_({ ok: false, error: 'clave_invalida' });
      return jsonOut_({ ok: true, pedidos: getPedidos_() });
    }

    if (action === 'reporte') {
      if (!checkAdmin_(e.parameter.clave)) return jsonOut_({ ok: false, error: 'clave_invalida' });
      return getReporteXlsx_();
    }

    return jsonOut_({ ok: false, error: 'accion_desconocida' });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === 'pedido') return jsonOut_(crearPedido_(data));
    if (action === 'comprobante') return jsonOut_(crearComprobante_(data));
    if (action === 'login') return jsonOut_({ ok: checkAdmin_(data.clave) });
    if (action === 'marcarEntregado') return jsonOut_(marcarEntregado_(data));
    if (action === 'marcarRendido') return jsonOut_(marcarRendido_(data));

    return jsonOut_({ ok: false, error: 'accion_desconocida' });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

// ================= LÓGICA =================

function checkAdmin_(clave) {
  return clave === ADMIN_PASSWORD;
}

function crearPedido_(data) {
  var nombre = (data.nombre || '').toString().trim();
  var docenas = Number(data.docenas);
  if (!nombre) return { ok: false, error: 'falta_nombre' };
  if (!docenas || docenas <= 0) return { ok: false, error: 'docenas_invalidas' };

  var sheet = getSheet_(PEDIDOS_SHEET, PEDIDOS_HEADERS);
  sheet.appendRow([new Date(), nombre, docenas, 'NO', '', 'NO', '', 'NO', '', '']);
  return { ok: true, nombre: nombre, docenas: docenas };
}

function crearComprobante_(data) {
  var nombre = (data.nombre || '').toString().trim();
  if (!nombre) return { ok: false, error: 'falta_nombre' };
  if (!data.archivoBase64 || !data.nombreArchivo) return { ok: false, error: 'falta_archivo' };

  var folder = getOrCreateFolder_(DRIVE_FOLDER_NAME);
  var bytes = Utilities.base64Decode(data.archivoBase64);
  var blob = Utilities.newBlob(bytes, data.tipoArchivo || 'application/octet-stream', data.nombreArchivo);
  var file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) { /* seguimos igual */ }

  var sheet = getSheet_(COMPROBANTES_SHEET, COMPROBANTES_HEADERS);
  sheet.appendRow([new Date(), nombre, file.getUrl(), data.aclaracion || '']);

  // No lo marcamos como rendido todavía: queda "pendiente de validar" hasta que
  // un administrador revise el comprobante y lo confirme desde el panel.
  var pedidosSheet = getSheet_(PEDIDOS_SHEET, PEDIDOS_HEADERS);
  var values = pedidosSheet.getDataRange().getValues();
  var marcados = 0;
  for (var i = 1; i < values.length; i++) {
    if (values[i][1] === nombre && values[i][5] !== 'SI') {
      pedidosSheet.getRange(i + 1, 8).setValue('SI');       // Comprobante pendiente de validar
      pedidosSheet.getRange(i + 1, 9).setValue(file.getUrl()); // Link comprobante
      marcados++;
    }
  }

  return { ok: true, url: file.getUrl(), nombre: nombre, pedidosPendientesDeValidar: marcados };
}

function marcarEntregado_(data) {
  if (!checkAdmin_(data.clave)) return { ok: false, error: 'clave_invalida' };
  var fila = Number(data.fila);
  if (!fila || fila < 2) return { ok: false, error: 'fila_invalida' };

  var sheet = getSheet_(PEDIDOS_SHEET, PEDIDOS_HEADERS);
  var entregado = !!data.entregado;
  sheet.getRange(fila, 4).setValue(entregado ? 'SI' : 'NO');
  sheet.getRange(fila, 5).setValue(entregado ? new Date() : '');
  return { ok: true };
}

function marcarRendido_(data) {
  // El administrador usa esta acción para: (a) confirmar un comprobante que
  // subió una familia (revisándolo primero), o (b) cargar a mano un pago en
  // efectivo que nunca tuvo comprobante.
  if (!checkAdmin_(data.clave)) return { ok: false, error: 'clave_invalida' };
  var fila = Number(data.fila);
  if (!fila || fila < 2) return { ok: false, error: 'fila_invalida' };

  var sheet = getSheet_(PEDIDOS_SHEET, PEDIDOS_HEADERS);
  var rendido = !!data.rendido;
  sheet.getRange(fila, 6).setValue(rendido ? 'SI' : 'NO');
  sheet.getRange(fila, 7).setValue(rendido ? new Date() : '');
  if (rendido) sheet.getRange(fila, 8).setValue('NO'); // ya se validó: deja de estar "pendiente"
  return { ok: true };
}

function getPedidos_() {
  var sheet = getSheet_(PEDIDOS_SHEET, PEDIDOS_HEADERS);
  var values = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][1]) continue; // fila vacía
    out.push({
      fila: i + 1,
      timestamp: values[i][0],
      nombre: values[i][1],
      docenas: values[i][2],
      entregado: values[i][3] === 'SI',
      fechaEntrega: values[i][4],
      rendido: values[i][5] === 'SI',
      fechaRendido: values[i][6],
      comprobantePendiente: values[i][7] === 'SI',
      linkComprobante: values[i][8] || '',
      notas: values[i][9]
    });
  }
  return out;
}

function getResumen_() {
  var pedidos = getPedidos_();
  var totalDocenas = 0, entregados = 0, rendidos = 0, pendientesValidar = 0;
  pedidos.forEach(function (p) {
    totalDocenas += Number(p.docenas) || 0;
    if (p.entregado) entregados++;
    if (p.rendido) rendidos++;
    if (p.comprobantePendiente && !p.rendido) pendientesValidar++;
  });
  return {
    ok: true,
    totalPedidos: pedidos.length,
    totalDocenas: totalDocenas,
    entregados: entregados,
    rendidos: rendidos,
    pendientesEntrega: pedidos.length - entregados,
    pendientesRendicion: pedidos.length - rendidos,
    pendientesValidar: pendientesValidar
  };
}

function getViajeros_() {
  var ss = SpreadsheetApp.openById(VIAJEROS_SHEET_ID);
  var sheet = ss.getSheets()[0];
  var values = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var v = values[i][0];
    if (v) out.push(String(v).trim());
  }
  return out;
}

function getReporteXlsx_() {
  var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/export?format=xlsx';
  var token = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  var nombre = 'Reporte Alfajores Gira Toritos ' + Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd') + '.xlsx';
  return response.getBlob().setName(nombre);
}

// ================= UTILIDADES =================

function getSheet_(name, headers) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function getOrCreateFolder_(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
