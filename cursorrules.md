## Component guidelines

### shadCN Components

- 모든 UI 컴포넌트는 shadCN 컴포넌트를 사용해야 한다.
- 컴포넌트 사용 전 설치 여부를 확인해야한다. : `/components/ui/` 폴더 내에 있는 컴포넌트는 설치 필요 없음.
- 컴포넌트 설치 명쳥어를 사용해야 한다. : `npx shadcn@latest add [component-name]`
    - 주의 `npx shadcn-ui@latest add` 명령어는 deprecated. 반드시 `npx shadcn@latest add` 명령어를 사용해야 한다.

### Icons

- 모든 아이콘은 Lucide React를 사용해야 한다.
- 아이콘 import 방법 : `import { IconName } from "lucide-react"`
- 예시 : `import { User, Menu } from "lucide-react"`

### Component Structure

- 컴포넌트는 `/components` 디렉토리 내에 생성해야 한다.
- UI 컴포넌트는 `/components/ui` 디렉토리 내에 생성해야 한다.
- 페이지별 컴포넌트는 `/app` 디렉토리 내 해당 라우트에 생성해야 한다.

## Best Practices

- TypeScript 타입은 반드시 정의해야 한다.
- 컴포넌트는 재사용 가능하도록 설계해야 한다.
