# Retro Pikachu Volleyball

브라우저에서 바로 플레이할 수 있는 **피카츄 배구** JavaScript 게임입니다. 시작 화면에서 1P CPU 대전과 로컬 2P 대전을 선택할 수 있고, 키 설정과 조작 안내를 바로 확인할 수 있습니다.

## Play

https://retro.oosu.dev/pikachu/

## Modes

### 1P · CPU 대전

왼쪽 피카츄를 직접 조작하고 오른쪽 피카츄는 CPU가 플레이합니다.

### 2P · 로컬 대전

같은 키보드에서 Player 1과 Player 2가 함께 플레이합니다.

게임에 처음 들어오면 1P / 2P를 명확하게 선택할 수 있으며, 기존 게임 내부의 선택 방식을 몰라도 바로 시작할 수 있습니다.

## Default controls

### Player 1

- 이동: `A` / `D`
- 점프: `W`
- 아래 방향: `S`
- 스매시 / 파워히트: `F`

### Player 2

- 이동: `←` / `→`
- 점프: `↑`
- 아래 방향: `↓`
- 스매시 / 파워히트: `Right Shift`

## Key settings

상단의 **키 설정** 메뉴에서 두 플레이어의 이동, 점프, 아래 방향, 스매시 키를 직접 변경할 수 있습니다.

- 변경한 키는 브라우저 `localStorage`에 저장됩니다.
- 이미 다른 조작에 사용 중인 키는 중복 지정되지 않습니다.
- **기본값 복원**으로 언제든 기본 키 배치로 돌아갈 수 있습니다.

## Gameplay

- 피카츄 캐릭터 스프라이트와 애니메이션
- 원래의 점프와 이동 감각
- 공과 캐릭터 충돌 및 반사
- 네트 충돌
- 점프 중 파워히트
- 방향 입력에 따른 공격 궤도
- 다이빙 동작
- CPU 플레이 로직
- 점수와 경기 종료 흐름
- 배경음악과 효과음

## Local development

```bash
npm install
npm start
```

## Production build

```bash
npm run build
```

빌드 결과는 `dist/`에 생성됩니다.

## Deployment

- Production: https://retro.oosu.dev/pikachu/
- Host: Mac mini
- Web server: Nginx
- Edge: Cloudflare Tunnel
