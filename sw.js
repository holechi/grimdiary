// 그림일기 Service Worker - 완전 오프라인 지원
const CACHE_NAME = 'grimDiary-v1';
const FILES_TO_CACHE = [
  './그림일기.html',
  './manifest.json'
];

// 설치: 앱 파일을 캐시에 저장
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] 캐시에 파일 저장 중...');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 활성화: 오래된 캐시 삭제
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE_NAME) {
          console.log('[SW] 오래된 캐시 삭제:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 네트워크 요청: 캐시 우선 → 오프라인에서도 동작
self.addEventListener('fetch', function(event) {
  // 외부 요청은 무시 (IndexedDB, 카메라 등은 SW를 거치지 않음)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        // 캐시에서 즉시 반환
        return response;
      }
      // 캐시에 없으면 네트워크에서 가져와 캐시에 저장
      return fetch(event.request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function() {
        // 완전 오프라인 상태 - 캐시에서 반환 (실패 시 기본 응답)
        return caches.match('./그림일기.html');
      });
    })
  );
});
