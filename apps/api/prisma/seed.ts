import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始播种数据...');

  // 创建管理员用户
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      role: 'ADMIN',
    },
  });
  console.log('✅ 创建管理员用户:', admin.username);

  // 创建普通用户
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { username: 'engineer' },
    update: {},
    create: {
      username: 'engineer',
      password: userPassword,
      name: '工程师',
      role: 'USER',
    },
  });
  console.log('✅ 创建普通用户:', user.username);

  // 创建机房
  const oldRoom = await prisma.room.create({
    data: {
      name: '旧机房A',
      location: '北京市朝阳区XX大厦3层',
      type: 'OLD',
    },
  });

  const newRoom = await prisma.room.create({
    data: {
      name: '新机房B',
      location: '北京市海淀区YY科技园1层',
      type: 'NEW',
    },
  });
  console.log('✅ 创建机房:', oldRoom.name, newRoom.name);

  // 创建机柜
  const racks = await Promise.all([
    prisma.rack.create({
      data: {
        name: 'A01',
        roomId: oldRoom.id,
        totalU: 42,
        row: 1,
        column: 1,
      },
    }),
    prisma.rack.create({
      data: {
        name: 'A02',
        roomId: oldRoom.id,
        totalU: 42,
        row: 1,
        column: 2,
      },
    }),
    prisma.rack.create({
      data: {
        name: 'B01',
        roomId: newRoom.id,
        totalU: 42,
        row: 1,
        column: 1,
      },
    }),
  ]);
  console.log('✅ 创建机柜:', racks.map(r => r.name).join(', '));

  // 创建设备模板 - portLayout需要序列化为JSON字符串
  const switchPortLayout = {
    front: [
      ...Array.from({ length: 24 }, (_, i) => ({
        id: `ge${i + 1}`,
        name: `GE${i + 1}`,
        type: 'RJ45',
        x: 30 + (i % 24) * 18,
        y: i < 24 ? 15 : 35,
        row: Math.floor(i / 24) + 1,
        col: (i % 24) + 1,
      })),
      ...Array.from({ length: 24 }, (_, i) => ({
        id: `ge${i + 25}`,
        name: `GE${i + 25}`,
        type: 'RJ45',
        x: 30 + (i % 24) * 18,
        y: 35,
        row: 2,
        col: (i % 24) + 1,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `sfp${i + 1}`,
        name: `SFP+${i + 1}`,
        type: 'SFP+',
        x: 470 + i * 20,
        y: 25,
        row: 1,
        col: i + 1,
      })),
    ],
    rear: [
      { id: 'console', name: 'Console', type: 'CONSOLE', x: 50, y: 25, row: 1, col: 1 },
      { id: 'mgmt', name: 'MGMT', type: 'RJ45', x: 80, y: 25, row: 1, col: 2 },
      { id: 'power1', name: 'PWR1', type: 'POWER', x: 450, y: 25, row: 1, col: 1 },
      { id: 'power2', name: 'PWR2', type: 'POWER', x: 500, y: 25, row: 1, col: 2 },
    ],
  };

  const switchTemplate = await prisma.deviceTemplate.create({
    data: {
      brand: 'Huawei',
      model: 'S5735-L48T4S-A',
      sizeU: 1,
      deviceType: 'SWITCH',
      isPublic: true,
      portLayout: JSON.stringify(switchPortLayout),
    },
  });

  const serverPortLayout = {
    front: [
      { id: 'disk1', name: 'Disk1', type: 'OTHER', x: 30, y: 20, row: 1, col: 1 },
      { id: 'disk2', name: 'Disk2', type: 'OTHER', x: 60, y: 20, row: 1, col: 2 },
      { id: 'disk3', name: 'Disk3', type: 'OTHER', x: 90, y: 20, row: 1, col: 3 },
      { id: 'disk4', name: 'Disk4', type: 'OTHER', x: 120, y: 20, row: 1, col: 4 },
    ],
    rear: [
      { id: 'idrac', name: 'iDRAC', type: 'RJ45', x: 50, y: 25, row: 1, col: 1 },
      { id: 'nic1', name: 'NIC1', type: 'RJ45', x: 100, y: 15, row: 1, col: 1 },
      { id: 'nic2', name: 'NIC2', type: 'RJ45', x: 125, y: 15, row: 1, col: 2 },
      { id: 'nic3', name: 'NIC3', type: 'RJ45', x: 100, y: 35, row: 2, col: 1 },
      { id: 'nic4', name: 'NIC4', type: 'RJ45', x: 125, y: 35, row: 2, col: 2 },
      { id: 'psu1', name: 'PSU1', type: 'POWER', x: 450, y: 25, row: 1, col: 1 },
      { id: 'psu2', name: 'PSU2', type: 'POWER', x: 500, y: 25, row: 1, col: 2 },
    ],
  };

  const serverTemplate = await prisma.deviceTemplate.create({
    data: {
      brand: 'Dell',
      model: 'PowerEdge R750',
      sizeU: 2,
      deviceType: 'SERVER',
      isPublic: true,
      portLayout: JSON.stringify(serverPortLayout),
    },
  });

  const firewallPortLayout = {
    front: [
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `ge${i + 1}`,
        name: `GE${i + 1}`,
        type: 'RJ45',
        x: 50 + i * 25,
        y: 25,
        row: 1,
        col: i + 1,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `sfp${i + 1}`,
        name: `SFP${i + 1}`,
        type: 'SFP',
        x: 280 + i * 25,
        y: 25,
        row: 1,
        col: i + 1,
      })),
    ],
    rear: [
      { id: 'console', name: 'Console', type: 'CONSOLE', x: 50, y: 25, row: 1, col: 1 },
      { id: 'usb', name: 'USB', type: 'USB', x: 80, y: 25, row: 1, col: 2 },
      { id: 'power', name: 'Power', type: 'POWER', x: 480, y: 25, row: 1, col: 1 },
    ],
  };

  const firewallTemplate = await prisma.deviceTemplate.create({
    data: {
      brand: 'Huawei',
      model: 'USG6555E',
      sizeU: 1,
      deviceType: 'FIREWALL',
      isPublic: true,
      portLayout: JSON.stringify(firewallPortLayout),
    },
  });
  console.log('✅ 创建设备模板:', switchTemplate.model, serverTemplate.model, firewallTemplate.model);

  // 创建设备
  const coreSwitch = await prisma.device.create({
    data: {
      name: '核心交换机-01',
      assetTag: 'SW-2024-001',
      templateId: switchTemplate.id,
      rackId: racks[0].id,
      positionU: 40,
      status: 'ONLINE',
    },
  });

  const server1 = await prisma.device.create({
    data: {
      name: '应用服务器-01',
      assetTag: 'SRV-2024-001',
      templateId: serverTemplate.id,
      rackId: racks[0].id,
      positionU: 35,
      status: 'ONLINE',
    },
  });

  const server2 = await prisma.device.create({
    data: {
      name: '数据库服务器-01',
      assetTag: 'SRV-2024-002',
      templateId: serverTemplate.id,
      rackId: racks[0].id,
      positionU: 33,
      status: 'ONLINE',
    },
  });

  const firewall = await prisma.device.create({
    data: {
      name: '防火墙-01',
      assetTag: 'FW-2024-001',
      templateId: firewallTemplate.id,
      rackId: racks[0].id,
      positionU: 42,
      status: 'ONLINE',
    },
  });
  console.log('✅ 创建设备:', coreSwitch.name, server1.name, server2.name, firewall.name);

  // 创建连线
  const cables = await Promise.all([
    prisma.cable.create({
      data: {
        traceCode: 'CBL-2024-A01-001',
        srcDeviceId: server1.id,
        srcPortIndex: 'nic1',
        dstDeviceId: coreSwitch.id,
        dstPortIndex: 'ge1',
        cableType: 'CAT6',
        color: '蓝色',
        purpose: '业务网络',
        status: 'LABELED',
      },
    }),
    prisma.cable.create({
      data: {
        traceCode: 'CBL-2024-A01-002',
        srcDeviceId: server1.id,
        srcPortIndex: 'nic2',
        dstDeviceId: coreSwitch.id,
        dstPortIndex: 'ge2',
        cableType: 'CAT6',
        color: '蓝色',
        purpose: '业务网络冗余',
        status: 'LABELED',
      },
    }),
    prisma.cable.create({
      data: {
        traceCode: 'CBL-2024-A01-003',
        srcDeviceId: server2.id,
        srcPortIndex: 'nic1',
        dstDeviceId: coreSwitch.id,
        dstPortIndex: 'ge3',
        cableType: 'CAT6',
        color: '绿色',
        purpose: '数据库网络',
        status: 'LABELED',
      },
    }),
    prisma.cable.create({
      data: {
        traceCode: 'CBL-2024-A01-004',
        srcDeviceId: coreSwitch.id,
        srcPortIndex: 'sfp1',
        dstDeviceId: firewall.id,
        dstPortIndex: 'sfp1',
        cableType: 'FIBER',
        color: '黄色',
        purpose: '上联防火墙',
        status: 'LABELED',
      },
    }),
  ]);
  console.log('✅ 创建连线:', cables.length, '条');

  console.log('🎉 数据播种完成!');
  console.log('---');
  console.log('管理员账号: admin / admin123');
  console.log('普通用户账号: engineer / user123');
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
