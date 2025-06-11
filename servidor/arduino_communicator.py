import serial
import serial.tools.list_ports
import time


class ArduinoCommunicator:
    def __init__(self):
        self.arduino = None
        self.connected = False
        self.last_port = None
        self.last_baudrate = 9600

    def conectar(self, port=None, baudrate=9600):
        """Tenta conectar ao Arduino de forma não bloqueante"""
        self.last_port = port
        self.last_baudrate = baudrate
        return self._tentar_conexao()

    def _tentar_conexao(self):
        try:
            if self.last_port is None:
                ports = serial.tools.list_ports.comports()
                for p in ports:
                    if 'Arduino' in p.description or 'CH340' in p.description:
                        self.last_port = p.device
                        break

                if self.last_port is None and len(ports) > 0:
                    self.last_port = ports[0].device

            if self.last_port is None:
                return False

            if self.arduino:
                self.arduino.close()

            self.arduino = serial.Serial(
                self.last_port, self.last_baudrate, timeout=0.2)
            time.sleep(2)
            self.connected = True
            print(f"\nConectado ao Arduino na porta {self.last_port}")
            return True

        except Exception as e:
            self.connected = False
            return False

    def verificar_conexao(self):
        """Verifica se a conexão está ativa"""
        if not self.connected or not self.arduino or not self.arduino.is_open:
            self.connected = False
            return False
        return True

    def send_message(self, message):
        """Envia mensagem para o Arduino"""
        if not self.verificar_conexao():
            print("Aguardando conexão com Arduino...")
            return False

        try:
            self.arduino.write((message + '\n').encode('utf-8'))
            print(f"Mensagem enviada: {message}")
            return True
        except Exception as e:
            print(f"Erro ao enviar mensagem: {e}")
            self.connected = False
            return False

    def read_message(self):
        """Lê mensagem do Arduino"""
        if not self.verificar_conexao():
            return None

        try:
            message = self.arduino.readline().decode('utf-8').strip()
            return message if message else None
        except Exception as e:
            self.connected = False
            return None

    def desconectar(self):
        """Fecha a conexão com o Arduino"""
        if self.arduino and self.arduino.is_open:
            self.arduino.close()
        self.connected = False

    def __del__(self):
        self.desconectar()
