import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Theme-aware color sets for the 3D viewer.
 */
function getViewerColors(isDark: boolean) {
  if (isDark) {
    return {
      // WebView HTML colors
      bgGradientStart: '#1a1a2e',
      bgGradientMid: '#16213e',
      bgGradientEnd: '#0f3460',
      loadingText: 'rgba(255, 255, 255, 0.7)',
      spinnerBorder: 'rgba(255, 255, 255, 0.1)',
      spinnerAccent: '#6C63FF',
      hintBg: 'rgba(0, 0, 0, 0.6)',
      hintText: 'white',
      errorTitle: 'white',
      errorText: 'rgba(255, 255, 255, 0.6)',
      // React Native colors
      headerBg: 'rgba(26, 26, 46, 0.95)',
      headerText: '#fff',
      backButtonBg: 'rgba(255, 255, 255, 0.1)',
      backButtonIcon: '#fff',
      containerBg: '#1a1a2e',
      bannerBg: 'rgba(108, 99, 255, 0.12)',
      bannerBorder: 'rgba(108, 99, 255, 0.25)',
      bannerText: 'rgba(255, 255, 255, 0.8)',
      bannerClose: 'rgba(255, 255, 255, 0.6)',
    };
  } else {
    return {
      // WebView HTML colors
      bgGradientStart: '#f0f2f5',
      bgGradientMid: '#e8ecf1',
      bgGradientEnd: '#dfe4ea',
      loadingText: 'rgba(0, 0, 0, 0.6)',
      spinnerBorder: 'rgba(0, 0, 0, 0.1)',
      spinnerAccent: '#2F3C7E',
      hintBg: 'rgba(0, 0, 0, 0.65)',
      hintText: 'white',
      errorTitle: '#1A1A1A',
      errorText: 'rgba(0, 0, 0, 0.5)',
      // React Native colors
      headerBg: 'rgba(255, 255, 255, 0.95)',
      headerText: '#1A1A1A',
      backButtonBg: 'rgba(0, 0, 0, 0.06)',
      backButtonIcon: '#1A1A1A',
      containerBg: '#f0f2f5',
      bannerBg: 'rgba(47, 60, 126, 0.08)',
      bannerBorder: 'rgba(47, 60, 126, 0.2)',
      bannerText: 'rgba(0, 0, 0, 0.7)',
      bannerClose: 'rgba(0, 0, 0, 0.4)',
    };
  }
}

/**
 * Generates the HTML content for the <model-viewer> web component.
 * Adapts colors based on light/dark theme.
 */
function generateModelViewerHTML(modelUrl: string, isDark: boolean): string {
  const c = getViewerColors(isDark);
  const accentColor = isDark ? '#6C63FF' : '#2F3C7E';
  const retryBg = accentColor;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>3D Preview</title>
  
  <!-- Google Model Viewer Web Component -->
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: linear-gradient(135deg, ${c.bgGradientStart} 0%, ${c.bgGradientMid} 50%, ${c.bgGradientEnd} 100%);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    model-viewer {
      width: 100%;
      height: 100%;
      --poster-color: transparent;
      --progress-bar-color: ${accentColor};
      --progress-bar-height: 4px;
    }
    
    /* Custom loading overlay */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, ${c.bgGradientStart} 0%, ${c.bgGradientMid} 50%, ${c.bgGradientEnd} 100%);
      z-index: 10;
      transition: opacity 0.5s ease;
    }
    
    .loading-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    
    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 3px solid ${c.spinnerBorder};
      border-top: 3px solid ${c.spinnerAccent};
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loading-text {
      color: ${c.loadingText};
      font-size: 14px;
    }
    
    /* Hint overlay */
    .hint-overlay {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: ${c.hintBg};
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: ${c.hintText};
      padding: 10px 20px;
      border-radius: 24px;
      font-size: 13px;
      z-index: 5;
      opacity: 1;
      transition: opacity 1s ease;
      pointer-events: none;
      white-space: nowrap;
    }
    
    .hint-overlay.hidden {
      opacity: 0;
    }

    /* Error state */
    .error-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, ${c.bgGradientStart} 0%, ${c.bgGradientMid} 50%, ${c.bgGradientEnd} 100%);
      z-index: 20;
      padding: 24px;
    }
    
    .error-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .error-title {
      color: ${c.errorTitle};
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      text-align: center;
    }
    
    .error-text {
      color: ${c.errorText};
      font-size: 14px;
      text-align: center;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    
    .retry-button {
      background: ${retryBg};
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <!-- Loading overlay -->
  <div class="loading-overlay" id="loadingOverlay">
    <div class="loading-spinner"></div>
    <div class="loading-text">Loading 3D model...</div>
  </div>
  
  <!-- Interaction hint -->
  <div class="hint-overlay" id="hintOverlay">
    👆 Swipe to rotate • Pinch to zoom
  </div>
  
  <!-- Error state (hidden by default) -->
  <div class="error-container" id="errorContainer" style="display: none;">
    <div class="error-icon">⚠️</div>
    <div class="error-title">Unable to Load 3D Model</div>
    <div class="error-text">
      Please check your internet connection and try again.
    </div>
    <button class="retry-button" onclick="retryLoad()">Try Again</button>
  </div>
  
  <model-viewer
    id="viewer"
    src="${modelUrl}"
    camera-controls
    auto-rotate
    auto-rotate-delay="1000"
    rotation-per-second="20deg"
    shadow-intensity="1.2"
    shadow-softness="0.8"
    environment-image="neutral"
    exposure="${isDark ? '1' : '1.2'}"
    interaction-prompt="auto"
    interaction-prompt-style="wiggle"
    camera-orbit="30deg 75deg auto"
    min-field-of-view="20deg"
    max-field-of-view="90deg"
    interpolation-decay="100"
    touch-action="pan-y"
    style="background-color: transparent;"
  ></model-viewer>
  
  <script>
    const viewer = document.getElementById('viewer');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const hintOverlay = document.getElementById('hintOverlay');
    const errorContainer = document.getElementById('errorContainer');
    
    let loadTimeout;
    
    // Handle successful model load
    viewer.addEventListener('load', () => {
      loadingOverlay.classList.add('hidden');
      
      // Hide hint after 4 seconds
      setTimeout(() => {
        hintOverlay.classList.add('hidden');
      }, 4000);
      
      // Clear error timeout
      if (loadTimeout) clearTimeout(loadTimeout);
    });
    
    // Handle model loading progress
    viewer.addEventListener('progress', (event) => {
      const progress = Math.round(event.detail.totalProgress * 100);
      const loadingText = loadingOverlay.querySelector('.loading-text');
      if (loadingText) {
        loadingText.textContent = progress < 100 
          ? 'Loading 3D model... ' + progress + '%'
          : 'Preparing view...';
      }
    });

    // Handle errors
    viewer.addEventListener('error', (event) => {
      console.error('Model viewer error:', event);
      showError();
    });
    
    // Timeout fallback — if model doesn't load in 30 seconds, show error
    loadTimeout = setTimeout(() => {
      if (!loadingOverlay.classList.contains('hidden')) {
        showError();
      }
    }, 30000);
    
    function showError() {
      loadingOverlay.style.display = 'none';
      hintOverlay.style.display = 'none';
      viewer.style.display = 'none';
      errorContainer.style.display = 'flex';
    }
    
    function retryLoad() {
      errorContainer.style.display = 'none';
      loadingOverlay.style.display = 'flex';
      loadingOverlay.classList.remove('hidden');
      viewer.style.display = 'block';
      viewer.src = '';
      
      // Small delay before re-setting the src to force a reload
      setTimeout(() => {
        viewer.src = '${modelUrl}';
      }, 100);
      
      // Reset timeout
      loadTimeout = setTimeout(() => {
        if (!loadingOverlay.classList.contains('hidden')) {
          showError();
        }
      }, 30000);
    }
    
    // Hide hint when user starts interacting
    viewer.addEventListener('camera-change', () => {
      hintOverlay.classList.add('hidden');
    }, { once: true });
  </script>
</body>
</html>
  `.trim();
}

export default function ModelViewerScreen() {
  const { modelUrl } = useLocalSearchParams<{ modelUrl: string }>();
  const { theme, isDark } = useTheme();
  const [showBanner, setShowBanner] = useState(true);
  const [webViewError, setWebViewError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const colors = getViewerColors(isDark);

  // Handle missing model URL
  if (!modelUrl || modelUrl.trim() === '') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.backButtonBg }]}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>3D Preview</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="cube-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
            No 3D Model Available
          </Text>
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            This product doesn't have a 3D model yet.
          </Text>
          <TouchableOpacity
            style={[styles.goBackButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Handle WebView-level error
  if (webViewError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.backButtonBg }]}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>3D Preview</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
            Unable to Load 3D Viewer
          </Text>
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            Please check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.goBackButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              setWebViewError(false);
            }}
          >
            <Text style={styles.goBackButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.containerBg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.backButtonBg }]}>
          <Ionicons name="arrow-back" size={24} color={colors.backButtonIcon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>3D Preview</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Info Banner */}
      {showBanner && (
        <View style={[styles.banner, { backgroundColor: colors.bannerBg, borderColor: colors.bannerBorder }]}>
          <View style={styles.bannerContent}>
            <Ionicons name="information-circle-outline" size={20} color={isDark ? '#6C63FF' : '#2F3C7E'} />
            <Text style={[styles.bannerText, { color: colors.bannerText }]}>
              AR placement isn't supported on this device. Showing interactive 3D preview — pinch to zoom, swipe to rotate.
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowBanner(false)} style={styles.bannerClose}>
            <Ionicons name="close" size={18} color={colors.bannerClose} />
          </TouchableOpacity>
        </View>
      )}

      {/* WebView with model-viewer */}
      <WebView
        ref={webViewRef}
        source={{ html: generateModelViewerHTML(modelUrl, isDark) }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        onError={() => setWebViewError(true)}
        onHttpError={() => setWebViewError(true)}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        allowsFullscreenVideo={false}
        mixedContentMode="compatibility"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  headerSpacer: {
    width: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  bannerClose: {
    padding: 4,
    marginLeft: 8,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  goBackButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  goBackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
