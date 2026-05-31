import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import hljs from 'highlight.js/lib/core';
import typescriptLang from 'highlight.js/lib/languages/typescript';
import bashLang from 'highlight.js/lib/languages/bash';
import pythonLang from 'highlight.js/lib/languages/python';
import csharpLang from 'highlight.js/lib/languages/csharp';
import javaLang from 'highlight.js/lib/languages/java';
import phpLang from 'highlight.js/lib/languages/php';
import rustLang from 'highlight.js/lib/languages/rust';
import jsonLang from 'highlight.js/lib/languages/json';
import xmlLang from 'highlight.js/lib/languages/xml';

// Register the small set of languages the SPA actually renders. Avoids
// loading the full hljs bundle (~1MB) for the handful of code-block
// renderings we need (Register-an-agent snippets across 7 languages,
// plus prompt content blocks).
hljs.registerLanguage('typescript', typescriptLang);
hljs.registerLanguage('ts', typescriptLang);
hljs.registerLanguage('bash', bashLang);
hljs.registerLanguage('shell', bashLang);
hljs.registerLanguage('sh', bashLang);
hljs.registerLanguage('python', pythonLang);
hljs.registerLanguage('py', pythonLang);
hljs.registerLanguage('csharp', csharpLang);
hljs.registerLanguage('cs', csharpLang);
hljs.registerLanguage('java', javaLang);
hljs.registerLanguage('php', phpLang);
hljs.registerLanguage('rust', rustLang);
hljs.registerLanguage('rs', rustLang);
hljs.registerLanguage('json', jsonLang);
hljs.registerLanguage('xml', xmlLang);
hljs.registerLanguage('html', xmlLang);

// ngx-markdown calls `window.hljs.highlight(code, { language })` when
// rendering fenced blocks. Exposing the configured instance here means
// we get coloured output for any of the registered languages without
// pulling the full hljs bundle.
if (typeof window !== 'undefined') {
  (window as any).hljs = hljs;
}
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import {
  AppstoreOutline,
  ApartmentOutline,
  ArrowLeftOutline,
  ArrowRightOutline,
  BankOutline,
  BellOutline,
  BgColorsOutline,
  BookOutline,
  BulbOutline,
  CheckCircleOutline,
  CheckOutline,
  ClockCircleOutline,
  CloseOutline,
  CodeOutline,
  CopyOutline,
  DeleteOutline,
  DownOutline,
  DownloadOutline,
  EditOutline,
  ExclamationCircleOutline,
  EyeOutline,
  FileTextOutline,
  FolderOpenOutline,
  ForkOutline,
  GroupOutline,
  HistoryOutline,
  InfoCircleOutline,
  KeyOutline,
  LinkOutline,
  LockOutline,
  LogoutOutline,
  MailOutline,
  MenuOutline,
  MoonOutline,
  MoreOutline,
  PlayCircleOutline,
  PauseCircleOutline,
  PartitionOutline,
  PlusOutline,
  ProjectOutline,
  ReloadOutline,
  RollbackOutline,
  RobotOutline,
  SafetyCertificateOutline,
  SaveOutline,
  SearchOutline,
  SendOutline,
  SettingOutline,
  StopOutline,
  SunOutline,
  TagOutline,
  TeamOutline,
  ThunderboltOutline,
  UserOutline,
  WarningOutline,
} from '@ant-design/icons-angular/icons';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

const ICONS = [
  AppstoreOutline, ApartmentOutline, ArrowLeftOutline, ArrowRightOutline,
  BankOutline, BellOutline, BgColorsOutline, BookOutline, BulbOutline, CheckCircleOutline,
  CheckOutline, ClockCircleOutline, CloseOutline, CodeOutline, CopyOutline,
  DeleteOutline, DownOutline, DownloadOutline, EditOutline,
  ExclamationCircleOutline, EyeOutline, FileTextOutline, FolderOpenOutline, ForkOutline,
  GroupOutline, HistoryOutline, InfoCircleOutline, KeyOutline, LinkOutline,
  LockOutline, LogoutOutline, MailOutline, MenuOutline, MoonOutline,
  MoreOutline, PlayCircleOutline, PauseCircleOutline, PartitionOutline,
  PlusOutline, ProjectOutline, ReloadOutline, RollbackOutline, RobotOutline,
  SafetyCertificateOutline, SaveOutline,
  SearchOutline, SendOutline, SettingOutline, StopOutline, SunOutline,
  TagOutline, TeamOutline, ThunderboltOutline, UserOutline, WarningOutline,
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideMarkdown({
      markedOptions: {
        provide: MARKED_OPTIONS,
        useValue: {
          breaks: false,
          gfm: true,
        },
      },
    }),
    provideNzI18n(en_US),
    provideNzIcons(ICONS),
    importProvidersFrom(NzModalModule, NzMessageModule, NzNotificationModule),
  ],
};
