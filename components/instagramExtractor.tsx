import React, { useRef, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import RecipeExtractorService from '../services/RecipeExtractorService';
import { Recipe } from '../models/Recipe';

export class PrivateAccountError extends Error {
  constructor() {
    super('This post is private or requires a login.');
    this.name = 'PrivateAccountError';
  }
}

export class NoCaptionError extends Error {
  constructor() {
    super('No recipe was found in this post\'s caption.');
    this.name = 'NoCaptionError';
  }
}

export class InstagramTimeoutError extends Error {
  constructor() {
    super('Instagram took too long to load. Please try again.');
    this.name = 'InstagramTimeoutError';
  }
}

export class InstagramRateLimitError extends Error {
  constructor() {
    super('Instagram has temporarily blocked access. Wait a few minutes and try again.');
    this.name = 'InstagramRateLimitError';
  }
}

const TIMEOUT_MS = 80000;

const EXTRACTION_JS = `
  (function() {
    var rn = window.ReactNativeWebView;
    if (!rn) { return; }
    try {
      if (window.location.href.includes('accounts/login')) {
        rn.postMessage(JSON.stringify({ error: 'private' }));
        return;
      }
      // Only run on Instagram post/reel pages, not on redirect hops
      if (!/instagram\\.com\\/(p|reel|tv)\\//.test(window.location.href)) {
        return;
      }
      // Soft-block detection: Instagram returns 200 but shows a rate-limit page
      var bodyText = document.body ? (document.body.innerText || '') : '';
      if (
        bodyText.includes('Try again later') ||
        bodyText.includes('Please wait a few minutes') ||
        bodyText.includes('Action Blocked')
      ) {
        rn.postMessage(JSON.stringify({ error: 'rate_limited' }));
        return;
      }
      var meta = document.querySelector('meta[name="description"]');
      var caption = meta ? meta.getAttribute('content') : '';
      var img = document.querySelector('meta[property="og:image"]');
      var imageUrl = img ? img.getAttribute('content') : '';
      if (!caption || caption.trim() === '') {
        rn.postMessage(JSON.stringify({ error: 'no_caption' }));
        return;
      }
      rn.postMessage(JSON.stringify({ caption: caption, imageUrl: imageUrl }));
    } catch(e) {
      rn.postMessage(JSON.stringify({ error: 'js_error', message: e.message }));
    }
  })();
  true;
`;

interface Props {
  url: string;
  onSuccess: (recipe: Recipe) => void;
  onError: (error: Error) => void;
}

export default function InstagramExtractor({ url, onSuccess, onError }: Props) {
  const webViewRef = useRef<WebView>(null);
  const settledRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback((fn: () => void) => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    fn();
  }, []);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      settle(() => onError(new InstagramTimeoutError()));
    }, TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleNavigationStateChange = useCallback((navState: { url: string }) => {
    if (navState.url.includes('accounts/login')) {
      settle(() => onError(new PrivateAccountError()));
    }
  }, [settle, onError]);

  const handleLoadEnd = useCallback(() => {
    webViewRef.current?.injectJavaScript(EXTRACTION_JS);
  }, []);

  const handleWebViewError = useCallback(() => {
    settle(() => onError(new Error('Could not load the Instagram page. Check your connection and try again.')));
  }, [settle, onError]);

  const handleHttpError = useCallback((syntheticEvent: any) => {
    const { statusCode } = syntheticEvent.nativeEvent;
    if (statusCode === 429) {
      settle(() => onError(new InstagramRateLimitError()));
    } else {
      settle(() => onError(new Error(`Could not load the Instagram page (HTTP ${statusCode}).`)));
    }
  }, [settle, onError]);

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    let payload: any;
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      settle(() => onError(new Error('Could not read Instagram response.')));
      return;
    }

    if (payload.error === 'private') {
      settle(() => onError(new PrivateAccountError()));
      return;
    }
    if (payload.error === 'no_caption') {
      settle(() => onError(new NoCaptionError()));
      return;
    }
    if (payload.error === 'rate_limited') {
      settle(() => onError(new InstagramRateLimitError()));
      return;
    }
    if (payload.error === 'js_error') {
      settle(() => onError(new Error('Could not read Instagram post. The page may have changed.')));
      return;
    }

    try {
      const recipe = await RecipeExtractorService.extractRecipeFromInstagramData(
        payload.caption,
        payload.imageUrl || null,
      );
      settle(() => onSuccess(recipe));
    } catch (err) {
      settle(() => onError(err instanceof Error ? err : new Error('Extraction failed.')));
    }
  }, [settle, onSuccess, onError]);

  return (
    <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={handleLoadEnd}
        onMessage={handleMessage}
        onError={handleWebViewError}
        onHttpError={handleHttpError}
        javaScriptEnabled
        sharedCookiesEnabled
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      />
    </View>
  );
}
