import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

type DeviceType = 'SERVER' | 'SWITCH' | 'ROUTER' | 'FIREWALL' | 'STORAGE' | 'PDU' | 'OTHER';

export interface TopologyNode {
  id: string;
  label: string;
  deviceType: string;
  status: string;
  rackName?: string;
  positionU?: number;
  layer: number; // 0: 核心层, 1: 汇聚层, 2: 接入层/服务器
}

export interface TopologyEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  cableType: string;
  status: string;
  label?: string;
}

@Injectable()
export class TopologyService {
  constructor(private prisma: PrismaService) {}

  // 根据设备类型确定层级
  private getDeviceLayer(deviceType: DeviceType | string): number {
    switch (deviceType) {
      case 'ROUTER':
      case 'FIREWALL':
        return 0; // 核心层
      case 'SWITCH':
        return 1; // 汇聚层
      case 'SERVER':
      case 'STORAGE':
      case 'PDU':
      case 'OTHER':
      default:
        return 2; // 接入层
    }
  }

  async getTopologyByRoom(roomId: string, projectId: string): Promise<{ nodes: TopologyNode[]; edges: TopologyEdge[]; summary: any }> {
    const devices = await this.prisma.device.findMany({
      where: { projectId, rack: { roomId } },
      include: {
        template: true,
        rack: true,
        cablesFrom: {
          include: {
            dstDevice: {
              include: {
                template: true,
                rack: true,
              },
            },
          },
        },
        cablesTo: {
          include: {
            srcDevice: {
              include: {
                template: true,
                rack: true,
              },
            },
          },
        },
      },
    });

    // 构建节点
    const nodes: TopologyNode[] = devices.map((device) => ({
      id: device.id,
      label: device.name,
      deviceType: device.template.deviceType,
      status: device.status,
      rackName: device.rack?.name,
      positionU: device.positionU || undefined,
      layer: this.getDeviceLayer(device.template.deviceType as DeviceType),
    }));

    // 构建边（去重）
    const edgeSet = new Set<string>();
    const edges: TopologyEdge[] = [];

    for (const device of devices) {
      for (const cable of device.cablesFrom) {
        const edgeKey = [cable.srcDeviceId, cable.dstDeviceId].sort().join('-');
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            id: cable.id,
            source: cable.srcDeviceId,
            sourcePort: cable.srcPortIndex,
            target: cable.dstDeviceId,
            targetPort: cable.dstPortIndex,
            cableType: cable.cableType,
            status: cable.status,
            label: cable.purpose || undefined,
          });
        }
      }
    }

    // 按层级排序节点
    nodes.sort((a, b) => a.layer - b.layer);

    return {
      nodes,
      edges,
      summary: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        layerCounts: {
          core: nodes.filter((n) => n.layer === 0).length,
          aggregation: nodes.filter((n) => n.layer === 1).length,
          access: nodes.filter((n) => n.layer === 2).length,
        },
      },
    };
  }

  async getDeviceConnections(deviceId: string, projectId: string): Promise<{ centerNode: TopologyNode; connectedNodes: TopologyNode[]; edges: TopologyEdge[] } | null> {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, projectId },
      include: {
        template: true,
        rack: true,
        cablesFrom: {
          include: {
            dstDevice: {
              include: {
                template: true,
                rack: true,
              },
            },
          },
        },
        cablesTo: {
          include: {
            srcDevice: {
              include: {
                template: true,
                rack: true,
              },
            },
          },
        },
      },
    });

    if (!device) {
      return null;
    }

    // 中心节点
    const centerNode: TopologyNode = {
      id: device.id,
      label: device.name,
      deviceType: device.template.deviceType,
      status: device.status,
      rackName: device.rack?.name,
      positionU: device.positionU || undefined,
      layer: this.getDeviceLayer(device.template.deviceType as DeviceType),
    };

    // 相邻节点和边
    const connectedNodes: TopologyNode[] = [];
    const edges: TopologyEdge[] = [];

    // 处理 cablesFrom
    for (const cable of device.cablesFrom) {
      const dstDevice = cable.dstDevice;
      connectedNodes.push({
        id: dstDevice.id,
        label: dstDevice.name,
        deviceType: dstDevice.template.deviceType,
        status: dstDevice.status,
        rackName: dstDevice.rack?.name,
        positionU: dstDevice.positionU || undefined,
        layer: this.getDeviceLayer(dstDevice.template.deviceType as DeviceType),
      });
      edges.push({
        id: cable.id,
        source: device.id,
        sourcePort: cable.srcPortIndex,
        target: dstDevice.id,
        targetPort: cable.dstPortIndex,
        cableType: cable.cableType,
        status: cable.status,
        label: cable.purpose || undefined,
      });
    }

    // 处理 cablesTo
    for (const cable of device.cablesTo) {
      const srcDevice = cable.srcDevice;
      connectedNodes.push({
        id: srcDevice.id,
        label: srcDevice.name,
        deviceType: srcDevice.template.deviceType,
        status: srcDevice.status,
        rackName: srcDevice.rack?.name,
        positionU: srcDevice.positionU || undefined,
        layer: this.getDeviceLayer(srcDevice.template.deviceType as DeviceType),
      });
      edges.push({
        id: cable.id,
        source: srcDevice.id,
        sourcePort: cable.srcPortIndex,
        target: device.id,
        targetPort: cable.dstPortIndex,
        cableType: cable.cableType,
        status: cable.status,
        label: cable.purpose || undefined,
      });
    }

    return {
      centerNode,
      connectedNodes,
      edges,
    };
  }
}
