package app.siftrecipes

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ShareIntentModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ShareIntent"

    @ReactMethod
    fun getSharedUrl(promise: Promise) {
        val intent = currentActivity?.intent
        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            val text = intent.getStringExtra(Intent.EXTRA_TEXT)
            intent.action = null
            promise.resolve(text)
        } else {
            promise.resolve(null)
        }
    }
}
