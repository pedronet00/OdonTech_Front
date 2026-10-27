import toast from 'react-hot-toast';

const UFS_VALIDAS = new Set([
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR',
  'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
]);

/**
 * Valida o endereço opcional do paciente. Se nenhum campo foi preenchido, o endereço é enviado como null;
 * se algum foi, os obrigatórios precisam estar completos. Mostra um toast com o primeiro problema encontrado.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateEndereco(endereco: any) {
  if (!endereco) return { isValid: true, data: null };

  const logradouro = endereco.logradouro?.trim() || '';
  const numero = endereco.numero;
  const complemento = endereco.complemento?.trim() || null;
  const bairro = endereco.bairro?.trim() || '';
  const cidade = endereco.cidade?.trim() || '';
  const estado = endereco.estado?.trim().toUpperCase() || '';
  const cep = endereco.cep?.trim() || '';

  const hasAnyField = !!(logradouro || numero || complemento || bairro || cidade || estado || cep);
  if (!hasAnyField) {
    return { isValid: true, data: null };
  }

  if (!logradouro) {
    toast.error('Logradouro é obrigatório no endereço.');
    return { isValid: false, data: null };
  }
  if (!numero || Number(numero) <= 0) {
    toast.error('Número do endereço deve ser maior que zero.');
    return { isValid: false, data: null };
  }
  if (!bairro) {
    toast.error('Bairro é obrigatório no endereço.');
    return { isValid: false, data: null };
  }
  if (!cidade) {
    toast.error('Cidade é obrigatória no endereço.');
    return { isValid: false, data: null };
  }
  if (!UFS_VALIDAS.has(estado)) {
    toast.error(`Estado (UF) inválido: '${endereco.estado || ''}'.`);
    return { isValid: false, data: null };
  }

  const apenasDigitos = cep.replace(/\D/g, '');
  if (apenasDigitos.length !== 8) {
    toast.error('CEP inválido. Deve conter 8 dígitos.');
    return { isValid: false, data: null };
  }

  const cepFormatado = `${apenasDigitos.substring(0, 5)}-${apenasDigitos.substring(5)}`;

  return {
    isValid: true,
    data: {
      logradouro,
      numero: Number(numero),
      complemento,
      bairro,
      cidade,
      estado,
      cep: cepFormatado
    }
  };
}
