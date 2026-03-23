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
    create: { username: 'admin', password: hashedPassword, name: '系统管理员', role: 'ADMIN' },
  });
  console.log('✅ 创建管理员用户:', admin.username);

  // 创建普通用户
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { username: 'engineer' },
    update: {},
    create: { username: 'engineer', password: userPassword, name: '工程师', role: 'USER' },
  });
  console.log('✅ 创建普通用户:', user.username);

  // 创建默认项目
  const project = await prisma.project.create({
    data: {
      name: '示例搬迁项目',
      description: '默认演示项目',
      inviteCode: 'DEMO01',
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: user.id, role: 'MEMBER' },
        ],
      },
    },
  });
  console.log('✅ 创建项目:', project.name, '邀请码:', project.inviteCode);

  // 创建机房
  const oldRoom = await prisma.room.create({
    data: { name: '旧机房A', location: '北京市朝阳区XX大厦3层', type: 'OLD', projectId: project.id },
  });
  const newRoom = await prisma.room.create({
    data: { name: '新机房B', location: '北京市海淀区YY科技园1层', type: 'NEW', projectId: project.id },
  });
  console.log('✅ 创建机房:', oldRoom.name, newRoom.name);

  // 创建机柜
  const racks = await Promise.all([
    prisma.rack.create({ data: { name: 'A01', roomId: oldRoom.id, totalU: 42, row: 1, column: 1, projectId: project.id } }),
    prisma.rack.create({ data: { name: 'A02', roomId: oldRoom.id, totalU: 42, row: 1, column: 2, projectId: project.id } }),
    prisma.rack.create({ data: { name: 'B01', roomId: newRoom.id, totalU: 42, row: 1, column: 1, projectId: project.id } }),
  ]);
  console.log('✅ 创建机柜:', racks.map(r => r.name).join(', '));

  // 创建设备模板
  const switchTemplate = await prisma.deviceTemplate.create({
    data: {
      brand: 'Huawei', model: 'S5735-L48T4S-A', sizeU: 1, deviceType: 'SWITCH',
      isPublic: true, portLayout: JSON.stringify({ front: [], rear: [] }), projectId: project.id,
    },
  });
  const serverTemplate = await prisma.deviceTemplate.create({
    data: {
      brand: 'Dell', model: 'PowerEdge R750', sizeU: 2, deviceType: 'SERVER',
      isPublic: true, portLayout: JSON.stringify({ front: [], rear: [] }), projectId: project.id,
    },
  });
  const firewallTemplate = await prisma.deviceTemplate.create({
    data: {
      brand: 'Huawei', model: 'USG6555E', sizeU: 1, deviceType: 'FIREWALL',
      isPublic: true, portLayout: JSON.stringify({ front: [], rear: [] }), projectId: project.id,
    },
  });
  console.log('✅ 创建设备模板:', switchTemplate.model, serverTemplate.model, firewallTemplate.model);

  // 创建设备
  const coreSwitch = await prisma.device.create({
    data: { name: '核心交换机-01', assetTag: 'SW-2024-001', templateId: switchTemplate.id, rackId: racks[0].id, positionU: 40, status: 'ONLINE', projectId: project.id },
  });
  const server1 = await prisma.device.create({
    data: { name: '应用服务器-01', assetTag: 'SRV-2024-001', templateId: serverTemplate.id, rackId: racks[0].id, positionU: 35, status: 'ONLINE', projectId: project.id },
  });
  const server2 = await prisma.device.create({
    data: { name: '数据库服务器-01', assetTag: 'SRV-2024-002', templateId: serverTemplate.id, rackId: racks[0].id, positionU: 33, status: 'ONLINE', projectId: project.id },
  });
  const firewall = await prisma.device.create({
    data: { name: '防火墙-01', assetTag: 'FW-2024-001', templateId: firewallTemplate.id, rackId: racks[0].id, positionU: 42, status: 'ONLINE', projectId: project.id },
  });
  console.log('✅ 创建设备:', coreSwitch.name, server1.name, server2.name, firewall.name);

  // 创建连线
  const cables = await Promise.all([
    prisma.cable.create({ data: { traceCode: 'CBL-2024-A01-001', srcDeviceId: server1.id, srcPortIndex: 'nic1', dstDeviceId: coreSwitch.id, dstPortIndex: 'ge1', cableType: 'CAT6', color: '蓝色', purpose: '业务网络', status: 'LABELED', projectId: project.id } }),
    prisma.cable.create({ data: { traceCode: 'CBL-2024-A01-002', srcDeviceId: server1.id, srcPortIndex: 'nic2', dstDeviceId: coreSwitch.id, dstPortIndex: 'ge2', cableType: 'CAT6', color: '蓝色', purpose: '业务网络冗余', status: 'LABELED', projectId: project.id } }),
    prisma.cable.create({ data: { traceCode: 'CBL-2024-A01-003', srcDeviceId: server2.id, srcPortIndex: 'nic1', dstDeviceId: coreSwitch.id, dstPortIndex: 'ge3', cableType: 'CAT6', color: '绿色', purpose: '数据库网络', status: 'LABELED', projectId: project.id } }),
    prisma.cable.create({ data: { traceCode: 'CBL-2024-A01-004', srcDeviceId: coreSwitch.id, srcPortIndex: 'sfp1', dstDeviceId: firewall.id, dstPortIndex: 'sfp1', cableType: 'FIBER', color: '黄色', purpose: '上联防火墙', status: 'LABELED', projectId: project.id } }),
  ]);
  console.log('✅ 创建连线:', cables.length, '条');

  console.log('🎉 数据播种完成!');
  console.log('管理员账号: admin / admin123');
  console.log('普通用户账号: engineer / user123');
  console.log('项目邀请码: DEMO01');
}

main()
  .catch((e) => { console.error('❌ 播种失败:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
