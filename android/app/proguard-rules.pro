# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ─── Capacitor ───────────────────────────────────────────────────────────────
# The bridge resolves plugins, their @PluginMethod entry points and their
# permission/activity callbacks BY NAME from JavaScript at runtime, so R8 sees
# no caller for any of them. Without these keeps the release build strips or
# renames the whole native layer and every Capacitor call fails at runtime
# (haptics, preferences, push, biometrics, share, filesystem, browser).
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep public class * extends com.getcapacitor.Plugin

# Installed plugins (see android/capacitor.settings.gradle):
# @capacitor/app, browser, filesystem, haptics, preferences,
# push-notifications, share.
-keep class com.capacitorjs.plugins.** { *; }
# @aparajita/capacitor-biometric-auth
-keep class com.aparajita.capacitor.** { *; }
# Cordova plugin bridge (capacitor-cordova-android-plugins) — empty today, but
# a plugin added later would be reflected into the same way.
-keep class org.apache.cordova.** { *; }

# Plugin call payloads are reflected over, and stack traces from a minified
# build are unreadable without the source/line attributes.
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
