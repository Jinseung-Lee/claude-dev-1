# 여행 만들기 지도에서 "Map container is being reused" 오류

## 증상

`/trips/new` 화면을 오갈 때(dev 서버 로그 기준) 다음 오류가 콘솔에
기록된다.

```
Uncaught TypeError: Cannot read properties of undefined (reading 'appendChild')
    at CityMap (app/trips/new/city-map.tsx:65:9)
Uncaught Error: Map container is being reused by another instance
    at MapContainerComponent (<anonymous>)
```

## 관찰한 증거

`/trips`(마이 여행 지도) 작업을 검증하는 도중 dev 서버 로그에서 발견했다.
`/trips/new` 페이지를 반복해서 오가거나 Fast Refresh가 일어날 때 Leaflet의
`MapContainer`가 이전 DOM 노드를 재사용하려다 실패하는 것으로 보인다.

## 추정 원인

Leaflet은 같은 DOM 컨테이너에 지도를 두 번 초기화하는 것을 허용하지
않는다. React의 Fast Refresh나 빠른 페이지 이동 중 이전 `MapContainer`
인스턴스가 정리되기 전에 새 인스턴스가 같은 컨테이너를 잡으려 하면 이
오류가 날 수 있다.

## 시도한 것

이번 세션에서는 `/trips`(마이 여행 지도) 작업 범위가 아니어서 직접
고치지 않았다. 실제 사용자 흐름(느린 클릭)에서도 재현되는지, 아니면
dev 환경의 빠른 리로드에서만 나오는지는 확인하지 못했다.

## 제안하는 다음 단계

- 프로덕션 빌드(`bun run build && bun start`)에서도 재현되는지 확인한다.
- 재현되면 `MapContainer`에 `key`를 라우트별로 고유하게 주거나,
  언마운트 시 `map.remove()`를 명시적으로 호출하는 정리 로직을 추가하는
  방향을 검토한다.
