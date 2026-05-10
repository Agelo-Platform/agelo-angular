import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideMarkdown } from 'ngx-markdown';
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
    provideMarkdown(),
    provideNzI18n(en_US),
    provideNzIcons(ICONS),
    importProvidersFrom(NzModalModule, NzMessageModule, NzNotificationModule),
  ],
};
