package expo.modules.liveactivity

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Equivalente Android da Live Activity: uma notificação PERSISTENTE com
 * cronómetro regressivo, visível no ecrã bloqueado enquanto o serviço decorre.
 *
 * O cronómetro é do sistema: setWhen(fim) + usesChronometer + countDown faz o
 * Android contar sozinho até ao instante de fim, sem a app acordar — o mesmo
 * princípio do Text(style:.timer) do iOS.
 *
 * Interface igual à do iOS (start/update/end/isSupported), para a costura JS
 * não saber de plataformas. Uma notificação de cada vez (id fixo): "atualizar"
 * é reemitir com o mesmo id; "terminar" é cancelá-la.
 */
class LiveActivityModule : Module() {
  companion object {
    private const val CHANNEL_ID = "piquet_service_progress"
    private const val NOTIFICATION_ID = 4711
  }

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context indisponível" }

  override fun definition() = ModuleDefinition {
    Name("LiveActivity")

    Function("isSupported") {
      // Android 8+ (canais de notificação). Abaixo disso não há ecrã bloqueado
      // com esta riqueza — degrada para no-op no lado JS.
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
    }

    Function("start") { technicianName: String, serviceType: String, endAtMs: Double ->
      ensureChannel()
      notify(technicianName, serviceType, endAtMs.toLong())
    }

    Function("update") { endAtMs: Double ->
      // Sem os textos aqui: reemitir precisa deles. Guarda-se o último conteúdo
      // para o update poder manter técnico/serviço e mexer só no fim.
      lastTechnician?.let { tech ->
        lastServiceType?.let { svc ->
          notify(tech, svc, endAtMs.toLong())
        }
      }
    }

    Function("end") {
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
      lastTechnician = null
      lastServiceType = null
    }
  }

  private var lastTechnician: String? = null
  private var lastServiceType: String? = null

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) == null) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Serviço em curso",
        NotificationManager.IMPORTANCE_LOW // sem som repetido a cada update
      ).apply {
        description = "Mostra o serviço a decorrer e quanto falta."
        setShowBadge(false)
      }
      manager.createNotificationChannel(channel)
    }
  }

  private fun notify(technicianName: String, serviceType: String, endAtMs: Long) {
    lastTechnician = technicianName
    lastServiceType = serviceType

    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      // Ícone do sistema para não depender de um recurso que pode não existir no
      // target; trocável por um do app depois.
      .setSmallIcon(android.R.drawable.ic_menu_recent_history)
      .setContentTitle(serviceType)
      .setContentText(technicianName)
      .setOngoing(true) // persistente: não se descarta com swipe
      .setOnlyAlertOnce(true) // updates não voltam a vibrar/tocar
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // aparece no ecrã bloqueado
      .setWhen(endAtMs)
      .setUsesChronometer(true)
      .setChronometerCountDown(true) // conta PARA BAIXO até endAtMs

    try {
      NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
    } catch (e: SecurityException) {
      // Sem permissão POST_NOTIFICATIONS (Android 13+ sem consentimento): não
      // rebenta — a costura JS já trata isto como best-effort.
    }
  }
}
