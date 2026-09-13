package dev.jekidev.ubermench.healthconnect

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlinx.coroutines.runBlocking
import org.json.JSONArray

@TauriPlugin
class HealthConnectPlugin(private val activity: Activity) : Plugin(activity) {
    private val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
    )
    private var pendingPermissionInvoke: Invoke? = null

    private fun clientOrNull(): HealthConnectClient? {
        return if (HealthConnectClient.getSdkStatus(activity) == HealthConnectClient.SDK_AVAILABLE) {
            HealthConnectClient.getOrCreate(activity)
        } else {
            null
        }
    }

    private fun permissionStatus(client: HealthConnectClient): JSObject {
        val granted = runBlocking { client.permissionController.getGrantedPermissions() }
        val missing = permissions.filterNot { granted.contains(it) }
        return JSObject().apply {
            put("available", true)
            put("installed", true)
            put("granted", JSONArray(granted.map { it.toString() }))
            put("missing", JSONArray(missing.map { it.toString() }))
        }
    }

    @Command
    fun health_connect_is_available(invoke: Invoke) {
        val installed = HealthConnectClient.getSdkStatus(activity) == HealthConnectClient.SDK_AVAILABLE
        invoke.resolve(JSObject().apply {
            put("available", installed)
            put("installed", installed)
            put("granted", JSONArray())
            put("missing", JSONArray())
        })
    }

    @Command
    fun health_connect_get_permission_status(invoke: Invoke) {
        val client = clientOrNull()
        if (client == null) {
            invoke.reject("Health Connect is not installed on this device.")
            return
        }
        invoke.resolve(permissionStatus(client))
    }

    @Command
    fun health_connect_request_permissions(invoke: Invoke) {
        val client = clientOrNull()
        if (client == null) {
            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("market://details?id=com.google.android.apps.healthdata")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            activity.startActivity(installIntent)
            invoke.reject("Install Health Connect from Play Store, then retry.")
            return
        }
        val already = permissionStatus(client)
        if (already.getJSONArray("missing").length() == 0) {
            invoke.resolve(already)
            return
        }
        pendingPermissionInvoke = invoke
        val contract = PermissionController.createRequestPermissionResultContract()
        activity.startActivityForResult(contract.createIntent(activity, permissions), PERMISSION_REQUEST)
    }

    @Command
    fun health_connect_sync_records(invoke: Invoke) {
        val client = clientOrNull()
        if (client == null) {
            invoke.reject("Health Connect is not available.")
            return
        }
        val from = invoke.getString("from")
        val to = invoke.getString("to")
        val end = if (to != null) Instant.parse(to) else Instant.now()
        val start = if (from != null) Instant.parse(from) else end.minus(7, ChronoUnit.DAYS)
        val range = TimeRangeFilter.between(start, end)

        runBlocking {
            val warnings = mutableListOf<String>()
            val payload = mutableListOf<JSObject>()

            val steps = client.readRecords(ReadRecordsRequest(StepsRecord::class, range))
            steps.records.forEach { record ->
                payload.add(sample("steps", record.count.toDouble(), "count", record.endTime.toString(), "steps-${record.endTime}"))
            }

            val heartRates = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, range))
            heartRates.records.forEach { record ->
                record.samples.forEachIndexed { index, sample ->
                    payload.add(sample("heart-rate", sample.beatsPerMinute.toDouble(), "bpm", sample.time.toString(), "heart-rate-${sample.time}-$index"))
                }
            }

            val resting = client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, range))
            resting.records.forEach { record ->
                payload.add(sample("resting_heart_rate", record.beatsPerMinute.toDouble(), "bpm", record.time.toString(), "resting-hr-${record.time}"))
            }

            val hrv = client.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, range))
            hrv.records.forEach { record ->
                payload.add(sample("hrv", record.heartRateVariabilityMillis.toDouble(), "ms", record.time.toString(), "hrv-${record.time}"))
            }

            val sleep = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, range))
            sleep.records.forEach { record ->
                val hours = (record.endTime.epochSecond - record.startTime.epochSecond) / 3600.0
                payload.add(sample("sleep", hours, "hours", record.endTime.toString(), "sleep-${record.startTime}-${record.endTime}"))
            }

            if (payload.isEmpty()) warnings.add("No Health Connect records found in the selected time range.")

            val samples = JSONArray()
            payload.forEach { samples.put(it) }
            invoke.resolve(JSObject().apply {
                put("samples", samples)
                put("cursor", end.toString())
                put("warnings", JSONArray(warnings))
            })
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != PERMISSION_REQUEST) {
            super.onActivityResult(requestCode, resultCode, data)
            return
        }
        val invoke = pendingPermissionInvoke
        pendingPermissionInvoke = null
        val client = clientOrNull()
        if (invoke == null) return
        if (client == null) {
            invoke.reject("Health Connect is not available.")
            return
        }
        invoke.resolve(permissionStatus(client))
    }

    private fun sample(metric: String, value: Double, unit: String, recordedAt: String, suffix: String): JSObject {
        return JSObject().apply {
            put("id", "hc-$suffix")
            put("metric", metric)
            put("value", value)
            put("unit", unit)
            put("recordedAt", recordedAt)
        }
    }

    companion object {
        private const val PERMISSION_REQUEST = 9911
    }
}
