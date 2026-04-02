import { DevServerManager, DevServerOptions } from '../DevServerManager';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('../Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}));

describe('DevServerManager', () => {
  let manager: DevServerManager;
  let mockProcess: EventEmitter & {
    kill: jest.Mock;
    killed: boolean;
    stdout: EventEmitter;
    stderr: EventEmitter;
    pid?: number;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new DevServerManager();

    // 创建 mock 进程 - 使用 EventEmitter 来支持 once/on 方法
    mockProcess = new EventEmitter() as any;
    mockProcess.kill = jest.fn();
    mockProcess.killed = false;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.pid = 12345;

    (spawn as jest.MockedFunction<typeof spawn>).mockReturnValue(mockProcess as unknown as ChildProcess);
  });

  afterEach(async () => {
    // 清理
    await manager.stop();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    test('should create instance with default values', () => {
      expect(manager).toBeDefined();
      expect(manager.getProcess()).toBeNull();
      expect(manager.getPort()).toBe(3000);
      expect(manager.isRunning()).toBe(false);
    });
  });

  describe('detectExistingServer', () => {
    test('should return URL if server already running on preferred port', async () => {
      // Mock fetch to return ok
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const result = await (manager as any).detectExistingServer(3000);

      expect(result).toBe('http://localhost:3000');
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000', expect.any(Object));
    });

    test('should scan multiple ports if server not on preferred port', async () => {
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Connection refused')) // port 3000
        .mockRejectedValueOnce(new Error('Connection refused')) // port 3001
        .mockResolvedValueOnce({ ok: true }); // port 5173

      const result = await (manager as any).detectExistingServer(3000);

      expect(result).toBe('http://localhost:5173');
    });

    test('should return null if no server found on any port', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await (manager as any).detectExistingServer(3000);

      expect(result).toBeNull();
    });
  });

  describe('detectStartCommand', () => {
    test('should return npm run dev when dev script exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        scripts: { dev: 'next dev' }
      }));

      const result = await (manager as any).detectStartCommand('/test');

      expect(result).toBe('npm run dev');
    });

    test('should return npm start when only start script exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        scripts: { start: 'node server.js' }
      }));

      const result = await (manager as any).detectStartCommand('/test');

      expect(result).toBe('npm start');
    });

    test('should detect Next.js from dependencies', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        scripts: {},
        dependencies: { next: '14.0.0' }
      }));

      const result = await (manager as any).detectStartCommand('/test');

      expect(result).toBe('npx next dev');
    });

    test('should detect Vite from devDependencies', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        scripts: {},
        devDependencies: { vite: '^5.0.0' }
      }));

      const result = await (manager as any).detectStartCommand('/test');

      expect(result).toBe('npx vite');
    });

    test('should detect Nuxt from dependencies', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        scripts: {},
        dependencies: { nuxt: '^3.0.0' }
      }));

      const result = await (manager as any).detectStartCommand('/test');

      expect(result).toBe('npx nuxt dev');
    });

    test('should return default command when package.json not found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await (manager as any).detectStartCommand('/test');

      expect(result).toBe('npm run dev');
    });

    test('should return default command when package.json is invalid', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const result = await (manager as any).detectStartCommand('/test');

      expect(result).toBe('npm run dev');
    });
  });

  describe('checkPort', () => {
    test('should return true when port is accessible', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const result = await (manager as any).checkPort(3000);

      expect(result).toBe(true);
    });

    test('should return false when port is not accessible', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await (manager as any).checkPort(3000);

      expect(result).toBe(false);
    });

    test('should return false when response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

      const result = await (manager as any).checkPort(3000);

      expect(result).toBe(false);
    });
  });

  describe('start', () => {
    test('should return existing server URL if already running', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const result = await manager.start({ port: 3000 });

      expect(result).toBe('http://localhost:3000');
      expect(spawn).not.toHaveBeenCalled();
    });

    test('should spawn new process when no server running', async () => {
      // 模拟没有现有服务器
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));
      
      // 模拟 package.json
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        scripts: { dev: 'next dev' }
      }));

      // 启动服务器但不等待完成（因为会超时）
      const startPromise = manager.start({ port: 9999, timeout: 100 });
      
      // 等待超时
      await expect(startPromise).rejects.toThrow('Timeout waiting for dev server');

      // 验证 spawn 被调用
      expect(spawn).toHaveBeenCalledWith(
        'npm run dev',
        expect.objectContaining({
          shell: true,
          cwd: process.cwd()
        })
      );
    });

    test('should use custom command when provided', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      // 启动服务器但不等待完成
      const startPromise = manager.start({ port: 9999, timeout: 100, command: 'yarn dev' });
      
      await expect(startPromise).rejects.toThrow('Timeout waiting for dev server');

      expect(spawn).toHaveBeenCalledWith(
        'yarn dev',
        expect.any(Object)
      );
    });

    test('should merge custom environment variables', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const startPromise = manager.start({
        port: 9999,
        timeout: 100,
        command: 'npm run dev',
        env: { CUSTOM_VAR: 'value' }
      });

      await expect(startPromise).rejects.toThrow('Timeout waiting for dev server');

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: expect.objectContaining({
            CUSTOM_VAR: 'value'
          })
        })
      );
    });
  });

  describe('stop', () => {
    test('should do nothing when no process running', async () => {
      await expect(manager.stop()).resolves.not.toThrow();
    });

    test('should kill running process', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      // 模拟 package.json 检测
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        scripts: { dev: 'next dev' }
      }));

      // 启动服务器（会超时）
      const startPromise = manager.start({ port: 9999, timeout: 50 });
      
      // 等待超时
      await expect(startPromise).rejects.toThrow('Timeout waiting for dev server');

      // 此时 process 应该为 null（因为超时后调用了 stop）
      // 我们手动设置 process 来测试 stop 功能
      (manager as any).process = mockProcess;
      
      // 停止服务器
      await manager.stop();

      // 验证 kill 被调用
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('getters', () => {
    test('getProcess should return current process', () => {
      expect(manager.getProcess()).toBeNull();
    });

    test('getPort should return current port', () => {
      expect(manager.getPort()).toBe(3000);
    });

    test('isRunning should return false when not started', () => {
      expect(manager.isRunning()).toBe(false);
    });
  });

  describe('setupLogHandlers', () => {
    test('should setup stdout and stderr handlers', () => {
      // 直接使用 EventEmitter 来测试 setupLogHandlers
      (manager as any).process = mockProcess;
      (manager as any).setupLogHandlers();
      
      // 验证 stdout 和 stderr 有事件监听
      expect(mockProcess.stdout.listenerCount('data')).toBe(1);
      expect(mockProcess.stderr.listenerCount('data')).toBe(1);
    });

    test('should handle stdout data', () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      manager.start({ port: 9999, timeout: 100 }).catch(() => {});

      // 模拟输出数据
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockProcess.stdout.emit('data', Buffer.from('Test output'));
      
      consoleSpy.mockRestore();
    });

    test('should handle stderr data', () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      manager.start({ port: 9999, timeout: 100 }).catch(() => {});

      // 模拟错误输出
      mockProcess.stderr.emit('data', Buffer.from('Error output'));
    });

    test('should handle process error', () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      // 模拟 package.json 检测
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        scripts: { dev: 'next dev' }
      }));

      // 监听错误事件，防止未处理
      mockProcess.on('error', () => {});

      manager.start({ port: 9999, timeout: 50 }).catch(() => {});

      // 模拟进程错误 - 使用 try/catch 避免未处理的错误
      try {
        mockProcess.emit('error', new Error('Process error'));
      } catch (e) {
        // 预期可能会抛出
      }
    });

    test('should handle process exit', () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      manager.start({ port: 9999, timeout: 100 }).catch(() => {});

      // 模拟进程退出
      mockProcess.emit('exit', 0, null);
      
      // 进程应该被设为 null
      expect(manager.getProcess()).toBeNull();
    });
  });
});
