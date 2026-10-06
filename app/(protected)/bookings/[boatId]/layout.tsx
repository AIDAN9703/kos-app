import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getPublicBoat } from "@/features/boats/boat.data";
import BoatProvider from "@/features/bookings/components/BoatProvider";
import BookingNavbar from "@/features/bookings/components/BookingNavbar";

export const dynamic = 'force-dynamic';


interface BookingLayoutProps {
  children: ReactNode;
  auth: ReactNode;
  params: Promise<{ boatId: string }>;
}

export default async function BookingLayout({ children, auth, params }: BookingLayoutProps) {
  const { boatId } = await params;
  const boat = await getPublicBoat(boatId);
  if (!boat) {
    notFound();
  }

  return (
    <BoatProvider boat={boat}>
      <BookingNavbar />
      {children}
      {auth}
    </BoatProvider>
  );
}
