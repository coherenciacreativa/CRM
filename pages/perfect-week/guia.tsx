import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/perfect-week/guia-completa.html',
      permanent: false,
    },
  };
};

export default function GuiaRedirectPage() {
  return null;
}
