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

@TauriPlugin
class HealthConnectPlugin(private val activity: Activity) : Plugin(activity) {
    private val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
    )

    private fun clientOrNull(): HealthConnectClient? {
        return if (HealthConnectClient.getSdkStatus(activity) == HealthConnectClient.SDK_AVAILABLE) {
            HealthConnectClient.getOrCreate(activity)
        } else {
            null
        }
    }

    @Command
    fun healthConnectIsAvailable(invoke: Invoke) {
        val installed = HealthConnectClient.getSdkStatus(activity) == HealthConnectClient.SDK_AVAILABLE
        val result = JSObject()
        result.put("available", installed)
        result.put("installed", installed)
        result.put("granted", JSObject())
        result.put("missing", JSObject())
        invoke.resolve(result)
    }

    @Command
    fun healthConnectGetPermissionStatus(invoke: Invoke) {
        val client = clientOrNull()
        if (client == null) {
            invoke.reject("Health Connect is not installed on this device.")
            return
        }
        runBlocking {
            val granted = client.permissionController.getGrantedPermissions()
            val missing = permissions.filterNot { granted.contains(it) }
            val result = JSObject()
            result.put("available", true)
            result.put("installed", true)
            result.put("granted", granted.map { it.toString() }.toTypedArray())
            result.put("missing", missing.map { it.toString() }.toTypedArray())
            invoke.resolve(result)
        }
    }

    @Command
    fun healthConnectRequestPermissions(invoke: Invoke) {
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
        val contract = PermissionController.createRequestPermissionResultContract()
        activity.startActivityForResult(contract.createIntent(activity, permissions), 9911)
        invoke.resolve(JSObject().apply {
            put("available", true)
            put("installed", true)
            put("granted", emptyArray<String>())
            put("missing", permissions.map { it.toString() }.toTypedArray())
        })
    }

    @Command
    fun healthConnectSyncRecords(invoke: Invoke) {
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
            val samples = JSObject()
            val warnings = mutableListOf<String>()
            val payload = mutableListOf<JSObject>()

            val steps = client.readRecords(ReadRecordsRequest(StepsRecord::class, range))
            steps.records.forEach { record ->
                payload.add(sample("steps", record.count.toDouble(), "count", record.endTime.toString(), "steps"))
            }

            val heartRates = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, range))
            heartRates.records.forEach { record ->
                record.samples.forEachIndexed { index, sample ->
                    payload.add(sample("heart-rate", sample.beatsPerMinute.toDouble(), "bpm", sample.time.toString(), "heart-rate-$index"))
                }
            }

            val resting = client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, range))
            resting.records.forEach { record ->
                payload.add(sample("resting-heart-rate", record.beatsPerMinute.toDouble(), "bpm", record.time.toString(), "resting-hr"))
            }

            val hrv = client.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, range))
            hrv.records.forEach { record ->
                payload.add(sample("hrv", record.heartRateVariabilityMillis.toDouble(), "ms", record.time.toString(), "hrv"))
            }

            val sleep = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, range))
            sleep.records.forEach { record ->
                val hours = (record.endTime.epochSecond - record.startTime.epochSecond) / 3600.0
                payload.add(sample("sleep", hours, "hours", record.endTime.toString(), "sleep"))
            }

            if (payload.isEmpty()) warnings.add("No Health Connect records found in the selected time range.")

            val result = JSObject()
            result.put("samples", payload.toTypedArray())
            result.put("cursor", end.toString())
            result.put("warnings", warnings.toTypedArray())
            invoke.resolve(result)
        }
    }

    private fun sample(metric: String, value: Double, unit: String, recordedAt: String, suffix: String): JSObject {
        return JSObject().apply {
            put("id", "hc-$suffix-$recordedAt")
            put("metric", metric)
            put("value", value)
            put("unit", unit)
            put("recordedAt", recordedAt)
        }
    }
}
